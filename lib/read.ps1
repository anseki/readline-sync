# readlineSync
# https://github.com/anseki/readline-sync
#
# Copyright (c) 2015 anseki
# Licensed under the MIT license.

Param(
  [string] $display,
  [switch] $keyIn,
  [switch] $noEchoBack,
  [string] $mask,
  [string] $exclude,
  [switch] $cs,
  [switch] $encoded
)

$ErrorActionPreference = 'Stop' # for cmdlet
trap {
  # `throw $_` and `Write-Error $_` return exit-code 0
  $Host.UI.WriteErrorLine($_)
  exit 1
}

function decodeDOS ($arg) {
  [Regex]::Replace($arg, '#(\d+);', { [char][int] $args[0].Groups[1].Value })
}

$options = @{}
foreach ($arg in @('display', 'keyIn', 'noEchoBack', 'mask', 'exclude', 'cs', 'encoded')) {
  $options.Add($arg, (Get-Variable $arg -ValueOnly))
}
if ($options.encoded) {
  $argList = New-Object string[] $options.Keys.Count
  $options.Keys.CopyTo($argList, 0);
  foreach ($arg in $argList) {
    if (($options[$arg] -is [string]) -and ($options[$arg] -ne ''))
      { $options[$arg] = decodeDOS $options[$arg] }
  }
}

[string] $inputTTY = ''
[bool] $isInputLine = $False
[bool] $isCooked = (-not $options.noEchoBack) -and (-not $options.keyIn)

function writeTTY ($text) {
  execWithTTY ('Write-Host ''' + ($text -replace '''', '''''') + ''' -NoNewline')
  $script:isInputLine = $True
}

# Instant method that opens TTY without CreateFile via P/Invoke in .NET Framework
# **NOTE** Don't include special characters of DOS in $command when $getRes is True.
# [string] $cmdPath = $Env:ComSpec
# [string] $psPath = 'powershell.exe'
function execWithTTY ($command, $getRes = $False) {
  if ($getRes) {
    $res = (cmd.exe /C "<CON powershell.exe -Command $command")
    if ($LastExitCode -ne 0) { exit 1 }
    return $res
  } else {
    $command | cmd.exe /C ">CON powershell.exe -Command -"
    if ($LastExitCode -ne 0) { exit 1 }
  }
}

if ($options.display -ne '') {
  writeTTY $options.display
  $options.display = ''
}

if ($options.noEchoBack -and (-not $options.keyIn) -and ($options.mask -eq '*')) {
  $inputTTY = execWithTTY ('$inputTTY = Read-Host -AsSecureString;' +
    '$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($inputTTY);' +
    '[System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)') $True
  return '''' + $inputTTY + ''''
}

if ($options.keyIn) { $reqSize = 1 }

while ($True) {
  if (-not $isCooked) {
    $chunk = execWithTTY '[System.Console]::ReadKey($True).KeyChar' $True
    # ReadKey() may returns [System.Array], then don't cast data.
    if ($chunk -isnot [string]) { $chunk = '' }
    $chunk = $chunk -replace '[\r\n]', ''
    if ($chunk -eq '') { $atEol = $True } # NL or empty-text was input
  } else {
    $chunk = execWithTTY 'Read-Host' $True
    $chunk = $chunk -replace '[\r\n]', ''
    $atEol = $True
  }

  # other ctrl-chars
  $chunk = $chunk -replace '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', ''

  if ($chunk -ne '' -and (-not $isCooked)) {
    if (-not $options.noEchoBack) {
      writeTTY $chunk
    } elseif ($options.mask -ne '') {
      writeTTY ($options.mask * $chunk.Length)
    }
  }

  $inputTTY += $chunk
  if ($atEol -or ($options.keyIn -and ($inputTTY.Length -ge $reqSize))) { break }
}

if ((-not $isCooked) -and (-not ($options.keyIn -and (-not $isInputLine))))
  { execWithTTY 'Write-Host ''''' } # new line

return '''' + $inputTTY + ''''

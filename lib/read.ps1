
Param(
  [string] $display,
  [switch] $noEchoBack,
  [string] $mask = '*',
  [switch] $keyIn,
  [switch] $encoded
)

$ErrorActionPreference = 'Stop' # for cmdlet
trap {
  # `throw $_` and `Write-Error $_` return exit-code 0
  $Host.UI.WriteErrorLine($_)
  exit 1
}

function decodeDOS($arg) {
  [Regex]::Replace($arg, '#(\d+);', { [char][int] $args[0].Groups[1].Value })
}

if ($encoded) {
  if ($display -ne '') { $display = decodeDOS $display }
  if ($mask -ne '') { $mask = decodeDOS $mask }
}

Write-Warning "[PS] display:     <$display>" #_DBG
Write-Warning "[PS] noEchoBack:  $noEchoBack" #_DBG
Write-Warning "[PS] mask:        <$mask>" #_DBG
Write-Warning "[PS] keyIn:       $keyIn" #_DBG

# Instant method that opens TTY without CreateFile via P/Invoke in .NET Framework
# **NOTE** Don't include special characters in $command when $getRes is True.
function execWithTTY ($command, $getRes = $False) {
  Write-Warning "[PS] command: <$command> getRes: $getRes" #_DBG
  if ($getRes) {
    $res = (cmd.exe /C "<CON powershell.exe -Command $command")
    if ($LastExitCode -ne 0) { exit 1 }
  } else {
    $command | cmd.exe /C ">CON powershell.exe -Command -"
    if ($LastExitCode -ne 0) { exit 1 }
    $res = ''
  }
  return $res
}

function writeTTY ($text) {
  execWithTTY ('Write-Host ''' + ($text -replace '''', '''''') + ''' -NoNewline')
}

[string] $inputTTY = ''

if ($noEchoBack -and (-not $keyIn) -and ($mask -eq '*')) {
  $inputTTY = execWithTTY ('$inputTTY = Read-Host -AsSecureString;' +
    '$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($inputTTY);' +
    '[System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)') $True
  return $inputTTY
}

$isEditable = (-not $noEchoBack) -and (-not $keyIn)
if ($keyIn) { $reqSize = 1 }
else { $reqSize = 1024 } # dummy

while ($True) {
  if ($isEditable) {
    $chunk = execWithTTY 'Read-Host' $True
    $chunk += "`n"
  } else { # raw
    $chunk = execWithTTY '[System.Console]::ReadKey($True).KeyChar' $True
  }

  if ($chunk -eq '') { break }
  $chunk = $chunk -replace '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', ''
  if ($chunk -eq '') { continue }

  if (-not $isEditable) {
    $displayInput = $chunk -replace '[\r\n]', ''
    if ($displayInput -ne '') {
      if ($noEchoBack) {
        if ($mask -eq '') { $displayInput = '' }
        else { $displayInput = $displayInput -replace '.', $mask }
      }
      if ($displayInput -ne '') { writeTTY $displayInput }
    }
  }

  $inputTTY += $chunk
  if (($inputTTY -match '[\r\n]$') -or ($keyIn -and ($inputTTY.Length -ge $reqSize)))
    { break }
}

if (-not $isEditable) { writeTTY "`n" } # new-line

return '''' + $inputTTY + '''' #DBG

process.stdout.write(decodeDOS(process.argv[2] /*text*/ || ''),
    process.env.RLS_ENCODING || 'binary', function() {
  process.exit(0);
});

function decodeDOS(arg) {
  return arg.replace(/#(\d+);/g, function(str, charCode) {
    return String.fromCharCode(+charCode);
  });
}

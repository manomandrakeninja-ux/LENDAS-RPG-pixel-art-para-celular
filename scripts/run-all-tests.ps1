$files = Get-ChildItem tests/*.test.js
$fail = @()
$pass = 0
foreach ($f in $files) {
  $out = node $f.FullName 2>&1 | Out-String
  if ($out -match 'fail 0') { $pass++ } else { $fail += $f.Name }
}
Write-Output "passaram: $pass / $($files.Count)"
if ($fail.Count) { Write-Output "falharam: $($fail -join ', ')" } else { Write-Output "TODOS PASSARAM" }

$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Talk With Sentient NPC.lnk"
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "C:\Users\R Mohith\Mohith\PROJECTS\TalkWithSentientNPC-main\Launch_TalkWithSentientNPC.bat"
$shortcut.WorkingDirectory = "C:\Users\R Mohith\Mohith\PROJECTS\TalkWithSentientNPC-main"
$shortcut.IconLocation = "C:\Users\R Mohith\Mohith\PROJECTS\TalkWithSentientNPC-main\skyrim.ico,0"
$shortcut.Description = "Talk With Sentient NPC - Voice-Interactive Skyrim AI"
$shortcut.Save()
Write-Host "Shortcut created successfully at $shortcutPath"

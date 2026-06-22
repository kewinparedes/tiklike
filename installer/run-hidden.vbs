' Inicia TikLike en segundo plano usando el Node empaquetado (node.exe junto a este archivo).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
appdir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = appdir
sh.Run """" & appdir & "\node.exe"" src\server.js", 0, False

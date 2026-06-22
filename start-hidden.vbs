' Inicia TikLike en segundo plano, sin ventana. Lo usa el autoarranque.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "cmd /c node src\server.js", 0, False

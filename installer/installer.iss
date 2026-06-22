; Instalador de TikLike (Inno Setup 6)
; Compila con: build.ps1  (o abre este archivo en Inno Setup y pulsa Compile)

#define MyAppName "TikLike"
#define MyAppVersion "1.0.0"
#define ProjectDir ".."

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=TikLike
AppPublisherURL=https://github.com/kewinparedes/tiklike
DefaultDirName={localappdata}\{#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
OutputDir=Output
OutputBaseFilename=TikLike-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=assets\icon.ico
WizardImageFile=assets\wizard-large.bmp
WizardSmallImageFile=assets\wizard-small.bmp
UninstallDisplayIcon={app}\icon.ico
LicenseFile={#ProjectDir}\LICENSE
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"

[Messages]
WelcomeLabel1=Bienvenido al instalador de [name]
WelcomeLabel2=Esto instalara [name] en tu PC: tu panel multistream de TikTok y Twitch para OBS.%n%nAl finalizar se abrira una pagina con la URL de tu panel para pegarla en OBS. No necesitas instalar nada mas.
FinishedLabelNoIcons=TikLike quedo instalado y ya esta corriendo.
FinishedLabel=TikLike quedo instalado y ya esta corriendo. Se abrira una pagina con la URL de tu panel.

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; Flags: unchecked

[Files]
Source: "assets\icon.ico";                       DestDir: "{app}";              Flags: ignoreversion
Source: "runtime\node.exe";                      DestDir: "{app}";              Flags: ignoreversion
Source: "run-hidden.vbs";                        DestDir: "{app}";              Flags: ignoreversion
Source: "TikLike-Panel.url";                     DestDir: "{app}";              Flags: ignoreversion
Source: "{#ProjectDir}\src\*";                   DestDir: "{app}\src";          Flags: recursesubdirs ignoreversion
Source: "{#ProjectDir}\public\*";                DestDir: "{app}\public";       Flags: recursesubdirs ignoreversion
Source: "{#ProjectDir}\node_modules\*";          DestDir: "{app}\node_modules"; Flags: recursesubdirs ignoreversion
Source: "{#ProjectDir}\package.json";            DestDir: "{app}";              Flags: ignoreversion
Source: "{#ProjectDir}\twitch.config.example.json"; DestDir: "{app}";           Flags: ignoreversion
Source: "{#ProjectDir}\SETUP.md";                DestDir: "{app}";              Flags: ignoreversion
Source: "{#ProjectDir}\LICENSE";                 DestDir: "{app}";              Flags: ignoreversion

[Icons]
Name: "{group}\Panel TikLike";       Filename: "{app}\TikLike-Panel.url";  IconFilename: "{app}\icon.ico"
Name: "{group}\Iniciar TikLike";     Filename: "{app}\run-hidden.vbs";     IconFilename: "{app}\icon.ico"
Name: "{group}\Desinstalar TikLike"; Filename: "{uninstallexe}"
Name: "{autodesktop}\TikLike";       Filename: "{app}\TikLike-Panel.url";  IconFilename: "{app}\icon.ico"; Tasks: desktopicon
Name: "{userstartup}\TikLike";       Filename: "{app}\run-hidden.vbs"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var rc: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    Exec('wscript.exe', '"' + ExpandConstant('{app}\run-hidden.vbs') + '"', '', SW_HIDE, ewNoWait, rc);
    Sleep(2800);
    ShellExec('open', 'http://localhost:4321/welcome.html', '', '', SW_SHOWNORMAL, ewNoWait, rc);
  end;
end;

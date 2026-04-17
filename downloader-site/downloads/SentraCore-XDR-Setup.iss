[Setup]
AppId={{6C68E9A6-4C77-4E4E-A710-9E2F6F8E3AA1}
AppName=SentraCore XDR
AppVersion=1.0.0
AppPublisher=SentraCore
DefaultDirName={autopf}\SentraCore XDR
DefaultGroupName=SentraCore XDR
OutputDir=.
OutputBaseFilename=SentraCore-XDR-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Files]
Source: "..\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\SentraCore XDR"; Filename: "{app}\Launch SentraCore XDR.cmd"
Name: "{commondesktop}\SentraCore XDR"; Filename: "{app}\Launch SentraCore XDR.cmd"
Name: "{group}\Setup SentraCore XDR"; Filename: "{app}\Setup SentraCore XDR.cmd"
Name: "{group}\Stop SentraCore XDR"; Filename: "{app}\Stop SentraCore XDR.cmd"

[Run]
Filename: "{app}\Setup SentraCore XDR.cmd"; Description: "Run first-time setup now"; Flags: postinstall shellexec

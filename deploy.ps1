# Rutas locales y remotas
$localPath = "C:\lhdes\Gestio Tributaria\Probaturas\xml-analisis"
$remotePath = "\\sawtest2022\c$\inetpub\wwwroot\xml-analisis"

# Parámetros del sitio IIS
$siteName = "xmlAnalisis"

# Construir el proyecto (si es necesario)
Write-Host "Building project..."
npm run build

# Detener el sitio en IIS
Write-Host "Stopping IIS site..."
Stop-WebSite -Name $siteName

# Copiar archivos al servidor remoto
Write-Host "Copying files..."
robocopy $localPath $remotePath /MIR

# Iniciar el sitio en IIS
Write-Host "Starting IIS site..."
Start-WebSite -Name $siteName

Write-Host "Deployment complete!"

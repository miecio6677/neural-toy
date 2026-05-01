param(
  [int]$Port = 4173
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$address = [System.Net.IPAddress]::Any
$listener = [System.Net.Sockets.TcpListener]::new($address, $Port)

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg" = "image/svg+xml"
}

function Write-Response($stream, $status, $contentType, [byte[]]$body) {
  $reason = if ($status -eq 200) { "OK" } elseif ($status -eq 403) { "Forbidden" } elseif ($status -eq 404) { "Not Found" } else { "Error" }
  $header = "HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  $stream.Write($body, 0, $body.Length)
}

function Send-Text($stream, $status, $text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  Write-Response $stream $status "text/plain; charset=utf-8" $bytes
}

try {
  $listener.Start()
  Write-Host "World Fishing 2D server: http://127.0.0.1:$Port/"
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        $client.Close()
        continue
      }

      do {
        $line = $reader.ReadLine()
      } while ($line -ne $null -and $line.Length -gt 0)

      $parts = $requestLine.Split(" ")
      if ($parts.Length -lt 2) {
        Send-Text $stream 400 "Bad request"
        $client.Close()
        continue
      }

      $relative = [Uri]::UnescapeDataString($parts[1].Split("?")[0].TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($relative)) {
        $relative = "index.html"
      }
      $relative = $relative.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
      $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

      if (-not $fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Text $stream 403 "Forbidden"
      }
      elseif (-not [System.IO.File]::Exists($fullPath)) {
        Send-Text $stream 404 "Not found"
      }
      else {
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
        $contentType = $mime[$extension]
        if (-not $contentType) {
          $contentType = "application/octet-stream"
        }
        Write-Response $stream 200 $contentType $bytes
      }
    }
    finally {
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
}

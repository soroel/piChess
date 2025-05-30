Write-Host "Starting clean deployment..."

# Remove existing build directory if it exists
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue

# Create build directory
New-Item -ItemType Directory -Force -Path build

# Copy files to build directory
Copy-Item -Force index.html build/
Copy-Item -Force manifest.json build/
Copy-Item -Force robots.txt build/
Copy-Item -Force favicon.ico build/
Copy-Item -Force logo192.png build/
Copy-Item -Force logo512.png build/
# Copy static directory
Copy-Item -Force static -Recurse build/
Copy-Item -Force validation-key.txt build/
Copy-Item -Force CNAME build/

# Remove existing files from root
Remove-Item -Force -Recurse -ErrorAction SilentlyContinue index.html, manifest.json, robots.txt, favicon.ico, logo192.png, logo512.png, static, validation-key.txt, CNAME

# Copy build files to root
Copy-Item -Force -Recurse build/* .

# Add and commit changes
git add .
git commit -m "Clean deployment with absolute paths"

# Push to gh-pages branch
git push -f https://github.com/soroel/piChess.git gh-pages

Write-Host "Deployment complete! Your site should be live at https://sorophine.tech"

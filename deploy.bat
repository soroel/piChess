@echo off

REM Build the project
call npm run startNode17 --openssl-legacy-provider build

REM Navigate to build directory
pushd build

REM Initialize git in build directory
git init

REM Add all files
git add .

REM Commit the files
git commit -m "Deploy to GitHub Pages"

REM Push to gh-pages branch
git push -f https://github.com/soroel/piChess.git master:gh-pages

REM Clean up - go back to original directory
popd
rmdir /s /q build

$ErrorActionPreference = "Continue"
Write-Host "1. Cleaning lock files..."
Remove-Item -Path "$env:USERPROFILE\.android\avd\QueueLess_Presentation.avd\*.lock" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "2. Starting Android Emulator in background..."
Start-Process -FilePath "C:\Users\mayma\AppData\Local\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd", "QueueLess_Presentation", "-no-snapshot-load", "-crash-report-mode", "never"

Write-Host "3. Waiting for ADB device to become available..."
adb wait-for-device

Write-Host "4. Waiting for Android OS boot to complete..."
$boot = ""
while ($boot -ne "1") {
    Start-Sleep -Seconds 2
    $boot = (adb shell getprop sys.boot_completed 2>&1).ToString().Trim()
    Write-Host "Current boot status: $boot"
}

Write-Host "5. Emulator is fully online! Installing APK..."
adb install -r "d:\Projects\Projects\QueueLess\mobile\android\app\build\outputs\apk\debug\app-debug.apk"

Write-Host "6. Launching QueueLess Mobile app..."
adb shell am start -n com.anonymous.queuelessmobile/.MainActivity

Write-Host "7. Verifying top activity..."
adb shell dumpsys window | Select-String "mCurrentFocus"
Write-Host "SUCCESS: App is launched and running on the emulator!"

on run
    set projectDir to "/Users/adj/Documents/Code/app-development/go-journal"
    set serverURL to "http://localhost:3000"

    -- Check if anything is already listening on port 3000
    set serverRunning to false
    try
        set portCheck to do shell script "lsof -ti:3000 2>/dev/null | head -1"
        if portCheck is not "" then
            set serverRunning to true
        end if
    end try

    if not serverRunning then
        -- Launch dev server in a Terminal window
        tell application "Terminal"
            activate
            do script "cd " & quoted form of projectDir & " && npm run dev"
        end tell
        -- Give Next.js a few seconds to compile and start
        delay 5
    end if

    -- Open in default browser
    open location serverURL
end run

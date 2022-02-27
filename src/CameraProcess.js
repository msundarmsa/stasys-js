process.on('message', (message) => {
    if (message == 'PING') {
        console.log('[CameraProcess] Received PING');
        if (process.send) {
            process.send('PONG');
            console.log('[CameraProcess] Sent PONG');
        }
    }
});
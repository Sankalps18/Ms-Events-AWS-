document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    try {
        await loadEvents();
    } catch (error) {
        document.getElementById('eventsGrid').innerHTML = 
            '<div class="error">Error loading events: ' + error.message + '</div>';
    }
}

async function loadEvents() {
    const events = await fetchEvents();
    displayEvents(events);
}
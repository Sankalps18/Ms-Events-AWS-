async function fetchEvents() {
    return await apiCall('/events');
}

async function fetchEventDetails(eventId) {
    return await apiCall(`/event/${eventId}`);
}

async function fetchEventStats(eventId) {
    return await apiCall(`/stats/${eventId}`);
}

async function fetchEventAttendees(eventId) {
    return await apiCall(`/attendees/${eventId}`);
}

async function submitRSVP(event, eventId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const rsvpData = {
        event_id: eventId,
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        response: formData.get('response')
    };

    try {
        await apiCall('/rsvp', {
            method: 'POST',
            headers: {
                // API Gateway is not routing OPTIONS /rsvp, so keep this CORS-simple.
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify(rsvpData)
        });

        showMessage('RSVP submitted successfully!', 'success');
        event.target.reset();

        setTimeout(() => {
            openEventModal(eventId);
            loadEventStats(eventId);
        }, 1000);
    } catch (error) {
        const errorMessage = error.message || 'RSVP failed';
        showMessage(errorMessage, 'error');
    }
}

function showMessage(message, type) {
    const existingMessage = document.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.textContent = message;

    const form = document.querySelector('.rsvp-form');
    const sectionTitle = form.closest('.section').querySelector('.section-title');

    if (sectionTitle) {
        sectionTitle.parentNode.insertBefore(messageDiv, sectionTitle.nextSibling);
    } else {
        form.parentNode.insertBefore(messageDiv, form);
    }

    if (type === 'success') {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}

function eventDetail(label, value) {
    return `
        <div class="event-detail">
            <span class="detail-icon">${label}</span>
            <span>${value}</span>
        </div>
    `;
}

function eventBanner(url, size = 800) {
    return url || `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=${size}`;
}

function displayEvents(events) {
    const grid = document.getElementById('eventsGrid');

    if (events.length === 0) {
        grid.innerHTML = '<div class="loading">No events found</div>';
        return;
    }

    grid.innerHTML = events.map(event => `
        <article class="event-card" onclick="openEventModal('${event.event_id}')">
            <div class="event-banner" style="background-image: url('${eventBanner(event.banner_url)}')"></div>
            <div class="event-content">
                <h2 class="event-title">${event.title}</h2>
                <p class="event-description">${event.description || 'Join us for an amazing event!'}</p>
                <div class="event-details">
                    ${eventDetail('Venue', event.venue || 'TBA')}
                    ${eventDetail('Date', formatDate(event.start_at))}
                </div>
            </div>
        </article>
    `).join('');
}

async function loadEventStats(eventId) {
    try {
        const stats = await fetchEventStats(eventId);
        document.getElementById(`yes-${eventId}`).textContent = stats.Yes || 0;
        document.getElementById(`no-${eventId}`).textContent = stats.No || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function openEventModal(eventId) {
    try {
        const modal = document.getElementById('eventModal');
        const modalContent = document.getElementById('modalContent');

        modalContent.innerHTML = '<div class="loading">Loading event details...</div>';
        modal.style.display = 'block';

        const [event, stats, attendees] = await Promise.all([
            fetchEventDetails(eventId),
            fetchEventStats(eventId),
            fetchEventAttendees(eventId)
        ]);

        modalContent.innerHTML = `
            <div class="modal-banner" style="background-image:url('${eventBanner(event.banner_url, 1200)}')"></div>

            <div class="modal-header">
                <h1 class="modal-title">${event.title}</h1>
                <p class="event-description">${event.description || ''}</p>
                <div class="modal-details">
                    ${eventDetail('Venue', event.venue || 'TBA')}
                    ${eventDetail('Date', formatDate(event.start_at))}
                    ${eventDetail('Time', formatTime(event.start_at))}
                </div>
            </div>

            <div class="modal-body">
                <section class="section">
                    <h2 class="section-title">RSVP to this Event</h2>
                    <form class="rsvp-form" onsubmit="submitRSVP(event, '${eventId}')">
                        <div class="form-group">
                            <label for="fullName">Full Name *</label>
                            <input type="text" id="fullName" name="full_name" autocomplete="name" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" id="email" name="email" autocomplete="email" required>
                        </div>
                        <div class="form-group">
                            <label for="response">Response *</label>
                            <select id="response" name="response" required>
                                <option value="">Select your response</option>
                                <option value="Yes">Yes, I'll be there!</option>
                                <option value="No">No, I can't make it</option>
                            </select>
                        </div>
                        <button type="submit" class="submit-btn">Submit RSVP</button>
                    </form>
                </section>

                <section class="section rsvp-section">
                    <h2 class="section-title">Event Statistics</h2>
                    <div class="stats-bar">
                        <div class="stat-card yes-card">
                            <span class="stat-number">${stats.Yes || 0}</span>
                            <span class="stat-label">Yes Responses</span>
                        </div>
                        <div class="stat-card no-card">
                            <span class="stat-number">${stats.No || 0}</span>
                            <span class="stat-label">No Responses</span>
                        </div>
                    </div>

                    <div class="attendees-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Going</th>
                                    <th>Not Going</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        ${
                                            attendees
                                                .filter(a => a.response.toLowerCase() === 'yes')
                                                .map(a => `<div>${a.full_name}</div>`)
                                                .join('') || '<em>No confirmed attendees yet.</em>'
                                        }
                                    </td>
                                    <td>
                                        ${
                                            attendees
                                                .filter(a => a.response.toLowerCase() === 'no')
                                                .map(a => `<div>${a.full_name}</div>`)
                                                .join('') || '<em>No declines yet.</em>'
                                        }
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        `;
    } catch (error) {
        document.getElementById('modalContent').innerHTML =
            `<div class="error">Error loading event details: ${error.message}</div>`;
    }
}

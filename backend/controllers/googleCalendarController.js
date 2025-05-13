const { google } = require("googleapis");
const asyncHandler = require("express-async-handler");

// @desc    Get events from Google Calendar
// @route   GET /api/google-calendar/events
// @access  Private
const getGoogleCalendarEvents = asyncHandler(async (req, res) => {
    try {
        // Authentication using service account
        // Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set
        const auth = new google.auth.GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        });
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });

        const { startDate, endDate } = req.query; // Expecting YYYY-MM-DD format

        const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
        // Default to end of day for endDate if provided, or a sensible future limit if not
        let timeMax;
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Set to end of day
            timeMax = end.toISOString();
        } else {
            const defaultEndDate = new Date(timeMin);
            defaultEndDate.setMonth(defaultEndDate.getMonth() + 3); // Default to 3 months in the future
            timeMax = defaultEndDate.toISOString();
        }

        const response = await calendar.events.list({
            calendarId: "primary", // Assumes the service account has access to the primary calendar
            timeMin: timeMin,
            timeMax: timeMax,
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = response.data.items.map((event) => {
            // Basic event data
            let formattedEvent = {
                id: event.id,
                source: "google",
                title: event.summary || "(Sem título)",
                start: event.start.dateTime || event.start.date, // Handles all-day events
                end: event.end.dateTime || event.end.date,     // Handles all-day events
                description: event.description || "",
                location: event.location || "",
                isRecording: false, // Default, logic to determine this can be added
                participantsInitials: [], // Default, logic to extract this can be added
            };

            // Attempt to determine if it's a recording (example: check title/description)
            if (event.summary && event.summary.toLowerCase().includes("gravação")) {
                formattedEvent.isRecording = true;
            }
            if (event.description && event.description.toLowerCase().includes("gravação")) {
                formattedEvent.isRecording = true;
            }

            // Attempt to extract participant initials (simplified)
            if (event.attendees) {
                formattedEvent.participantsInitials = event.attendees
                    .filter(att => att.displayName || att.email)
                    .map(att => {
                        if (att.displayName) {
                            const names = att.displayName.split(" ");
                            if (names.length > 1) {
                                return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
                            }
                            return names[0].substring(0, 2).toUpperCase();
                        }
                        return att.email.substring(0, 2).toUpperCase();
                    });
            }

            return formattedEvent;
        });

        res.json(events);

    } catch (error) {
        console.error("Error fetching Google Calendar events:", error);
        // Check for specific auth errors related to GOOGLE_APPLICATION_CREDENTIALS
        if (error.message && (error.message.includes("Could not load the default credentials") || error.message.includes("file not found"))) {
            res.status(500).json({ 
                message: "Erro de configuração do servidor: Não foi possível carregar as credenciais do Google. Verifique a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS.",
                details: "Certifique-se de que o arquivo JSON da conta de serviço do Google está configurado corretamente no servidor e a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS aponta para ele."
            });
        } else if (error.code === 403 || (error.response && error.response.status === 403)){
             res.status(403).json({ 
                message: "Erro de permissão: A conta de serviço não tem permissão para acessar o calendário solicitado ou a API Google Calendar não está habilitada.",
                details: "Verifique as permissões da conta de serviço no Google Cloud Console e se a API Google Calendar está habilitada para o projeto."
            });
        } else {
            res.status(500).json({ message: "Erro ao buscar eventos do Google Calendar", error: error.message });
        }
    }
});

console.log("[DEBUG] Exporting from googleCalendarController.js:", { getGoogleCalendarEvents });

module.exports = {
    getGoogleCalendarEvents,
};


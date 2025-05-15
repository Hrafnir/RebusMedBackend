/* Version: #8 */

// === GLOBALE VARIABLER ===
let map;
let currentMapMarker;
let userPositionMarker;
let mapElement;
let currentTeamData = null;
let currentUser = null;
let mapPositionWatchId = null;
let finishMarker = null;
// 'db', 'analytics', 'auth' er globale variabler definert i index.html

// === GLOBAL KONFIGURASJON ===
const FICTITIOUS_DOMAIN = "@rebus.game"; // Brukes for å lage "e-post" for auth
const TOTAL_POSTS = 2; // VIKTIG: Endre denne hvis du har flere poster (f.eks. 10 basert på bildet ditt)
// Hvis TOTAL_POSTS endres, må POST_LOCATIONS, POST_UNLOCK_HINTS, POST_UNLOCK_CODES, CORRECT_TASK_ANSWERS også utvides tilsvarende.
// HTML-en må også ha sider for alle postene.

const POST_LOCATIONS = [
    { lat: 60.81260478331276, lng: 10.673852939210269, title: "Post 1", name: "Demonstrasjonssted Alfa"},
    { lat: 60.812993, lng: 10.672853, title: "Post 2", name: "Demonstrasjonssted Beta"}
    // Legg til flere her hvis TOTAL_POSTS > 2
];
const START_LOCATION = { lat: 60.8127, lng: 10.6737, title: "Startområde Demo" };
const FINISH_LOCATION = { lat: 60.8124, lng: 10.6734, title: "Mål: Lærerværelset (Plassholder)" };

const POST_UNLOCK_HINTS = {
    1: "Et sted for flygende baller.",
    2: "Arbeidslivets forpost."
    // Legg til flere her
};

const POST_UNLOCK_CODES = {
    1: "PEDAGOG",
    2: "LÆRING"
    // Legg til flere her
};
const CORRECT_TASK_ANSWERS = {
    1: "RICHARD HØGÅS",
    2: "KNUT PHARO"
    // Legg til flere her
};
const MAX_ATTEMPTS_PER_TASK = 5;
const POINTS_PER_CORRECT_TASK = 5;


// === GOOGLE MAPS API CALLBACK ===
window.initMap = function() {
    mapElement = document.getElementById('dynamic-map-container');
    if (!mapElement) {
        setTimeout(window.initMap, 500);
        return;
    }
    const mapStyles = [ { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] } ];
    map = new google.maps.Map(mapElement, {
        center: START_LOCATION, zoom: 17, mapTypeId: google.maps.MapTypeId.SATELLITE,
        styles: mapStyles, disableDefaultUI: false, streetViewControl: false, fullscreenControl: true,
        mapTypeControlOptions: { style: google.maps.MapTypeControlStyle.DROPDOWN_MENU, mapTypeIds: [google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID] }
    });
    if (currentTeamData && currentUser) { // Sjekk at bruker er logget inn også
        if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
            const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            if (currentPostGlobalId) updateMapMarker(currentPostGlobalId, false); // Sjekk at ID er gyldig
            startContinuousUserPositionUpdate();
        } else if (currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            updateMapMarker(null, true);
        }
    }
    console.log("BUS Lærerrebus Kart initialisert.");
};

// === GLOBALE KARTFUNKSJONER ===
function updateMapMarker(postGlobalId, isFinalTarget = false) { if (!map) { console.warn("Kart ikke initialisert for updateMapMarker."); return; } clearMapMarker(); clearFinishMarker(); let location; let markerTitle; let markerIconUrl; if (isFinalTarget) { location = FINISH_LOCATION; markerTitle = FINISH_LOCATION.title; markerIconUrl = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'; finishMarker = new google.maps.Marker({ position: { lat: location.lat, lng: location.lng }, map: map, title: markerTitle, animation: google.maps.Animation.DROP, icon: { url: markerIconUrl } }); } else { if (!postGlobalId || postGlobalId < 1 || postGlobalId > POST_LOCATIONS.length) { console.warn("Ugyldig postGlobalId for updateMapMarker:", postGlobalId, "Sjekk POST_LOCATIONS lengde."); return; } location = POST_LOCATIONS[postGlobalId - 1]; markerTitle = `Neste: ${location.name || location.title}`; markerIconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'; currentMapMarker = new google.maps.Marker({ position: { lat: location.lat, lng: location.lng }, map: map, title: markerTitle, animation: google.maps.Animation.DROP, icon: { url: markerIconUrl } }); } if(location) { map.panTo({ lat: location.lat, lng: location.lng }); if (map.getZoom() < 18) map.setZoom(18); } }
function clearMapMarker() { if (currentMapMarker) { currentMapMarker.setMap(null); currentMapMarker = null; } }
function clearFinishMarker() { if (finishMarker) { finishMarker.setMap(null); finishMarker = null; } }
function handleGeolocationError(error) { let msg = "Posisjonsfeil: "; switch (error.code) { case error.PERMISSION_DENIED: msg += "Nektet."; break; case error.POSITION_UNAVAILABLE: msg += "Utilgjengelig."; break; case error.TIMEOUT: msg += "Timeout."; break; default: msg += "Ukjent."; } console.warn(msg); }
function updateUserPositionOnMap(position) { if (!map) return; const userPos = { lat: position.coords.latitude, lng: position.coords.longitude }; if (userPositionMarker) { userPositionMarker.setPosition(userPos); } else { userPositionMarker = new google.maps.Marker({ position: userPos, map: map, title: "Din Posisjon", icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#1976D2", fillOpacity: 1, strokeWeight: 2, strokeColor: "white" } }); } }
function handlePositionUpdate(position) { updateUserPositionOnMap(position); }
function startContinuousUserPositionUpdate() { if (!navigator.geolocation) { console.warn("Geolocation ikke støttet."); return; } if (mapPositionWatchId !== null) { /* console.log("GPS-sporing er allerede aktiv."); */ return;  } console.log("Starter kontinuerlig GPS posisjonssporing for kart."); mapPositionWatchId = navigator.geolocation.watchPosition( handlePositionUpdate, (error) => { handleGeolocationError(error); if (error.code !== error.PERMISSION_DENIED) {  stopContinuousUserPositionUpdate();  } }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 } ); }
function stopContinuousUserPositionUpdate() { if (mapPositionWatchId !== null) { navigator.geolocation.clearWatch(mapPositionWatchId); mapPositionWatchId = null; console.log("Stoppet kontinuerlig GPS sporing for kart."); } }


// === FIREBASE STATE MANAGEMENT FUNKSJONER ===
async function saveState() {
    if (currentUser && currentTeamData) {
        try {
            console.log(`Saving state for team (UID: ${currentUser.uid}) to Firestore...`, currentTeamData);
            // Bruk set med merge:true for å unngå utilsiktet sletting av felter hvis currentTeamData er ufullstendig
            await db.collection('teams').doc(currentUser.uid).set(JSON.parse(JSON.stringify(currentTeamData)), { merge: true });
            console.log("State saved to Firestore successfully for UID:", currentUser.uid);
        } catch (error) {
            console.error("Error saving state to Firestore: ", error);
            alert("En feil oppstod under lagring av fremgang. Sjekk konsollen.");
        }
    } else {
        console.warn("No currentUser or currentTeamData to save. State not saved.");
    }
}

async function loadTeamDataForUser(user) {
    if (!user || !user.uid) {
        console.log("No user or user UID provided to loadTeamDataForUser.");
        currentTeamData = null;
        return false;
    }
    currentUser = user; // Sett global currentUser

    try {
        console.log(`Attempting to load team data for user UID ${user.uid} from Firestore...`);
        const docRef = db.collection('teams').doc(user.uid);
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            currentTeamData = docSnap.data();
            console.log("Team data loaded from Firestore:", currentTeamData);

            // Enkel validering
            if (!currentTeamData || typeof currentTeamData.teamCode !== 'string' ||
                typeof currentTeamData.completedPostsCount !== 'number' ||
                !Array.isArray(currentTeamData.postSequence)) {
                console.warn("Loaded team data from Firestore is corrupt or missing key values.");
                currentTeamData = null;
                return false;
            }
            // Sørg for at disse objektene/mapene finnes hvis de mangler fra DB
            if (typeof currentTeamData.completedGlobalPosts !== 'object' || currentTeamData.completedGlobalPosts === null) currentTeamData.completedGlobalPosts = {};
            if (typeof currentTeamData.unlockedPosts !== 'object' || currentTeamData.unlockedPosts === null) currentTeamData.unlockedPosts = {};
            if (typeof currentTeamData.taskAttempts !== 'object' || currentTeamData.taskAttempts === null) currentTeamData.taskAttempts = {};
            
            return true;
        } else {
            console.warn(`No data document found in Firestore for user UID ${user.uid}. This user account exists, but has no associated team data.`);
            currentTeamData = null;
            // Brukeren blir værende på login-siden. De kan ikke starte uten team data.
            return false;
        }
    } catch (error) {
        console.error("Error loading team data from Firestore: ", error);
        currentTeamData = null;
        alert("En feil oppstod under lasting av lagret fremgang. Sjekk konsollen.");
        return false;
    }
}

async function resetProgressForCurrentTeam() {
    if (currentUser && currentTeamData) {
        try {
            console.log(`Resetting progress for team ${currentTeamData.name} (UID: ${currentUser.uid}) in Firestore...`);
            const progressToReset = {
                currentPostArrayIndex: 0,
                completedPostsCount: 0,
                completedGlobalPosts: {},
                unlockedPosts: {},
                score: 0,
                taskAttempts: {}
            };
            await db.collection('teams').doc(currentUser.uid).update(progressToReset);
            console.log(`Progress reset in Firestore for UID ${currentUser.uid}.`);
            // Last inn de "nye" (nullstilte) dataene lokalt
            await loadTeamDataForUser(currentUser); 
        } catch (error) {
            console.error(`Error resetting progress for UID ${currentUser.uid}: `, error);
            alert("Feil ved nullstilling av fremgang i databasen.");
        }
    } else {
        console.warn("Cannot reset progress: No current user or team data.");
    }
}


// === UI-FUNKSJONER ===
function updateScoreDisplay() { /* ... som i v7 ... */ if (currentTeamData && document.getElementById('score-display') && document.getElementById('current-score')) { document.getElementById('current-score').textContent = currentTeamData.score; document.getElementById('score-display').style.display = 'block'; } if (document.getElementById('final-score') && currentTeamData) { document.getElementById('final-score').textContent = currentTeamData.score; } }
function updatePageText(pageElement, teamPostNumber, globalPostId) { /* ... som i v7 ... */ const titleElement = pageElement.querySelector('.post-title-placeholder'); const introElement = pageElement.querySelector('.post-intro-placeholder'); if (titleElement) { titleElement.textContent = `Oppdrag ${teamPostNumber} av ${TOTAL_POSTS}: Ankomstkode`; if (teamPostNumber === TOTAL_POSTS) { titleElement.textContent = `Siste Oppdrag (${teamPostNumber} av ${TOTAL_POSTS}): Ankomstkode`; } } if (introElement) { const postDetails = POST_LOCATIONS[globalPostId - 1]; const postName = postDetails ? postDetails.name : `Post ${globalPostId}`; const commonInstruction = "Bruk kartet for å finne poststedet. Der finner dere ankomstkoden."; const specificHint = POST_UNLOCK_HINTS[globalPostId] ? ` Hint: ${POST_UNLOCK_HINTS[globalPostId]}` : ""; introElement.textContent = `Velkommen til ${postName}. ${commonInstruction}${specificHint}`; if (teamPostNumber === TOTAL_POSTS) { introElement.textContent = `Dette er siste oppgave før målgang! Velkommen til ${postName}. ${commonInstruction}${specificHint}`; } } }
function showRebusPage(pageId) { /* ... som i v7 ... */ document.querySelectorAll('#rebus-content .page').forEach(page => page.classList.remove('visible')); const nextPageElement = document.getElementById(pageId); if (nextPageElement) { nextPageElement.classList.add('visible'); const container = document.querySelector('.container'); if (container) window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' }); if (currentTeamData && pageId.startsWith('post-')) { const globalPostNum = parseInt(pageId.split('-')[1]); if (!isNaN(globalPostNum) && currentTeamData.postSequence) { const teamPostNum = currentTeamData.postSequence.indexOf(globalPostNum) + 1; if (teamPostNum > 0) { updatePageText(nextPageElement, teamPostNum, globalPostNum); } else { console.warn(`Global post ${globalPostNum} ikke funnet i lagets sekvens:`, currentTeamData.postSequence); } } } resetPageUI(pageId); if (currentTeamData && pageId !== 'intro-page' && pageId !== 'finale-page') { updateScoreDisplay(); } else if (document.getElementById('score-display') && pageId !== 'finale-page') { document.getElementById('score-display').style.display = 'none'; } if (pageId === 'finale-page' && document.getElementById('final-score') && currentTeamData) { document.getElementById('final-score').textContent = currentTeamData.score; } } else { console.error("Side ikke funnet:", pageId, "Fallback til intro-siden."); const intro = document.getElementById('intro-page'); if(intro) intro.classList.add('visible'); } }
function showTabContent(tabId) { /* ... som i v7 ... */ document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('visible')); const nextContent = document.getElementById(tabId + '-content'); if (nextContent) nextContent.classList.add('visible'); else console.error("Tab-innhold ikke funnet:", tabId + '-content'); document.querySelectorAll('.tab-button').forEach(button => { button.classList.remove('active'); if (button.getAttribute('data-tab') === tabId) button.classList.add('active'); }); }
function resetPageUI(pageId) { /* ... som i v7 ... */ if (pageId === 'intro-page' || pageId === 'finale-page') return; const postNumberMatch = pageId.match(/post-(\d+)-page/); if (!postNumberMatch) return; const postNumStr = postNumberMatch[1]; const postNumGlobal = parseInt(postNumStr); const pageElement = document.getElementById(pageId); if (!pageElement) return; const unlockSection = pageElement.querySelector('.post-unlock-section'); const taskSection = pageElement.querySelector('.post-task-section'); const unlockInput = document.getElementById(`post-${postNumStr}-unlock-input`); const unlockButton = pageElement.querySelector('.unlock-post-btn'); const unlockFeedback = document.getElementById(`feedback-unlock-${postNumStr}`); const taskInput = document.getElementById(`post-${postNumStr}-task-input`); const taskButton = pageElement.querySelector('.check-task-btn'); const taskFeedback = document.getElementById(`feedback-task-${postNumStr}`); const attemptCounterElement = document.getElementById(`attempts-${postNumStr}`); if (attemptCounterElement) attemptCounterElement.textContent = ''; const isPostUnlocked = currentTeamData?.unlockedPosts?.[postNumGlobal]; const isTaskCompleted = currentTeamData?.completedGlobalPosts?.[postNumGlobal]; if (unlockSection && taskSection) { if (isTaskCompleted) { unlockSection.style.display = 'none'; taskSection.style.display = 'block'; if (taskInput) { taskInput.disabled = true; } if (taskButton) taskButton.disabled = true; if (taskFeedback) { taskFeedback.textContent = 'Oppgave fullført!'; taskFeedback.className = 'feedback success'; } if (attemptCounterElement) attemptCounterElement.textContent = ''; } else if (isPostUnlocked) { unlockSection.style.display = 'none'; taskSection.style.display = 'block'; if (taskInput) { taskInput.disabled = false; taskInput.value = ''; } if (taskButton) taskButton.disabled = false; if (taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; } if (attemptCounterElement && currentTeamData?.taskAttempts?.[postNumGlobal] !== undefined) { const attemptsLeft = MAX_ATTEMPTS_PER_TASK - currentTeamData.taskAttempts[postNumGlobal]; attemptCounterElement.textContent = `Forsøk igjen: ${attemptsLeft > 0 ? attemptsLeft : 0}`; } else if (attemptCounterElement) { attemptCounterElement.textContent = `Forsøk igjen: ${MAX_ATTEMPTS_PER_TASK}`; } } else { unlockSection.style.display = 'block'; taskSection.style.display = 'none'; if (unlockInput) { unlockInput.disabled = false; unlockInput.value = ''; } if (unlockButton) unlockButton.disabled = false; if (unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; } } } }
function resetAllUIOnLogout() {
    for (let i = 1; i <= TOTAL_POSTS; i++) { // Endre TOTAL_POSTS hvis du har flere poster
        const pageElement = document.getElementById(`post-${i}-page`);
        if (!pageElement) continue;
        const unlockSection = pageElement.querySelector('.post-unlock-section'); const taskSection = pageElement.querySelector('.post-task-section'); const unlockInput = document.getElementById(`post-${i}-unlock-input`); const unlockButton = pageElement.querySelector('.unlock-post-btn'); const unlockFeedback = document.getElementById(`feedback-unlock-${i}`); const taskInput = document.getElementById(`post-${i}-task-input`); const taskButton = pageElement.querySelector('.check-task-btn'); const taskFeedback = document.getElementById(`feedback-task-${i}`); const attemptCounterElement = document.getElementById(`attempts-${i}`); if (unlockSection) unlockSection.style.display = 'block'; if (taskSection) taskSection.style.display = 'none'; if (unlockInput) { unlockInput.value = ''; unlockInput.disabled = false; } if (unlockButton) unlockButton.disabled = false; if (unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; } if (taskInput) { taskInput.value = ''; taskInput.disabled = false; } if (taskButton) taskButton.disabled = false; if (taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; } if (attemptCounterElement) attemptCounterElement.textContent = ''; const titlePlaceholder = pageElement.querySelector('.post-title-placeholder'); if (titlePlaceholder) titlePlaceholder.textContent = `Post ${i}: Ankomstkode`; const introPlaceholder = pageElement.querySelector('.post-intro-placeholder'); if (introPlaceholder) introPlaceholder.textContent = "Finn ankomstkoden på stedet for å låse opp oppgaven.";
    }
    const authTeamNameInput = document.getElementById('auth-teamname-input');
    const authPasswordInput = document.getElementById('auth-password-input');
    const authFeedback = document.getElementById('auth-feedback');
    if (authTeamNameInput) authTeamNameInput.value = '';
    if (authPasswordInput) authPasswordInput.value = '';
    if (authFeedback) { authFeedback.textContent = ''; authFeedback.className = 'feedback'; }

    const authSection = document.getElementById('auth-section');
    const teamWelcomeSection = document.getElementById('team-welcome-section');
    if(authSection) authSection.style.display = 'block';
    if(teamWelcomeSection) teamWelcomeSection.style.display = 'none';
    const loggedInTeamNameSpan = document.getElementById('loggedInTeamName');
    if(loggedInTeamNameSpan) loggedInTeamNameSpan.textContent = "";


    const scoreDisplay = document.getElementById('score-display');
    if(scoreDisplay) scoreDisplay.style.display = 'none';
    showRebusPage('intro-page');
    console.log("All UI elements reset for logout.");
}


// === KJERNE REBUSLOGIKK ===
async function handlePostUnlock(postNumStr, userAnswer) { /* ... som i v7 ... */ const postNumGlobal = parseInt(postNumStr); const unlockInput = document.getElementById(`post-${postNumStr}-unlock-input`); const feedbackElement = document.getElementById(`feedback-unlock-${postNumStr}`); const unlockButton = document.querySelector(`#post-${postNumStr}-page .unlock-post-btn`); if (!currentTeamData) { if (feedbackElement) { feedbackElement.textContent = 'Feil: Gruppe ikke startet.'; feedbackElement.className = 'feedback error'; } return; } const correctUnlockCode = POST_UNLOCK_CODES[postNumGlobal]; if (feedbackElement) { feedbackElement.className = 'feedback'; feedbackElement.textContent = ''; } if (!userAnswer) { if (feedbackElement) { feedbackElement.textContent = 'Skriv ankomstkoden!'; feedbackElement.classList.add('error', 'shake'); } if (unlockInput) unlockInput.classList.add('shake'); setTimeout(() => { if (feedbackElement) feedbackElement.classList.remove('shake'); if (unlockInput) unlockInput.classList.remove('shake'); }, 400); return; } if (userAnswer === correctUnlockCode?.toUpperCase() || userAnswer === 'ÅPNE') { if (feedbackElement) { feedbackElement.textContent = 'Post låst opp! Her er oppgaven:'; feedbackElement.classList.add('success'); } if (unlockInput) unlockInput.disabled = true; if (unlockButton) unlockButton.disabled = true; if (!currentTeamData.unlockedPosts) currentTeamData.unlockedPosts = {}; currentTeamData.unlockedPosts[postNumGlobal] = true; if (!currentTeamData.taskAttempts) currentTeamData.taskAttempts = {}; currentTeamData.taskAttempts[postNumGlobal] = 0; await saveState(); setTimeout(() => { resetPageUI(`post-${postNumGlobal}-page`); updateScoreDisplay(); }, 800); } else { if (feedbackElement) { feedbackElement.textContent = 'Feil ankomstkode. Prøv igjen!'; feedbackElement.classList.add('error', 'shake'); } if (unlockInput) { unlockInput.classList.add('shake'); setTimeout(() => unlockInput.classList.remove('shake'), 400); unlockInput.focus(); unlockInput.select(); } if(feedbackElement) setTimeout(() => feedbackElement.classList.remove('shake'), 400); } }
function proceedToNextPostOrFinish() { /* ... som i v7 ... */ currentTeamData.currentPostArrayIndex++; if (currentTeamData.completedPostsCount < TOTAL_POSTS) { if (currentTeamData.currentPostArrayIndex < currentTeamData.postSequence.length) { const nextPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex]; setTimeout(() => { showRebusPage(`post-${nextPostGlobalId}-page`); if (map) updateMapMarker(nextPostGlobalId, false); }, 1200); } else { console.warn("Færre enn TOTAL_POSTS fullført, men ingen flere poster i sekvensen. Viser finale."); setTimeout(() => { showRebusPage('finale-page'); if (map) updateMapMarker(null, true); stopContinuousUserPositionUpdate(); }, 1200); } } else { setTimeout(() => { showRebusPage('finale-page'); if (map) updateMapMarker(null, true); stopContinuousUserPositionUpdate(); }, 1200); } }
async function handleTaskCheck(postNumStr, userAnswer) { /* ... som i v7 ... */ const postNumGlobal = parseInt(postNumStr); const taskInput = document.getElementById(`post-${postNumStr}-task-input`); const feedbackElement = document.getElementById(`feedback-task-${postNumStr}`); const attemptCounterElement = document.getElementById(`attempts-${postNumStr}`); const taskButton = document.querySelector(`#post-${postNumStr}-page .check-task-btn`); if (!currentTeamData) { if (feedbackElement) { feedbackElement.textContent = 'Feil: Gruppe ikke startet.'; feedbackElement.className = 'feedback error'; } return; } const correctTaskAnswer = CORRECT_TASK_ANSWERS[postNumGlobal]; if (feedbackElement) { feedbackElement.className = 'feedback'; feedbackElement.textContent = ''; } if (!userAnswer) { if (feedbackElement) { feedbackElement.textContent = 'Svar på oppgaven!'; feedbackElement.classList.add('error', 'shake'); } if (taskInput) taskInput.classList.add('shake'); setTimeout(() => { if (feedbackElement) feedbackElement.classList.remove('shake'); if (taskInput) taskInput.classList.remove('shake'); }, 400); return; } const isCorrect = (userAnswer.toUpperCase() === correctTaskAnswer?.toUpperCase() || userAnswer.toUpperCase() === 'FASIT'); if (!currentTeamData.taskAttempts) currentTeamData.taskAttempts = {}; if (currentTeamData.taskAttempts[postNumGlobal] === undefined) { currentTeamData.taskAttempts[postNumGlobal] = 0; } if (isCorrect) { if (feedbackElement) { feedbackElement.textContent = userAnswer.toUpperCase() === 'FASIT' ? 'FASIT godkjent! (Ingen poeng)' : 'Korrekt svar!'; feedbackElement.classList.add('success'); } if (taskInput) taskInput.disabled = true; if (taskButton) taskButton.disabled = true; if (userAnswer.toUpperCase() !== 'FASIT') { let pointsAwarded = POINTS_PER_CORRECT_TASK - (currentTeamData.taskAttempts[postNumGlobal] || 0); currentTeamData.score += Math.max(0, pointsAwarded); } if (!currentTeamData.completedGlobalPosts) currentTeamData.completedGlobalPosts = {}; if (!currentTeamData.completedGlobalPosts[postNumGlobal]) { currentTeamData.completedGlobalPosts[postNumGlobal] = true; currentTeamData.completedPostsCount++; } await saveState(); updateScoreDisplay(); proceedToNextPostOrFinish(); } else { currentTeamData.taskAttempts[postNumGlobal]++; const attemptsLeft = MAX_ATTEMPTS_PER_TASK - currentTeamData.taskAttempts[postNumGlobal]; if (attemptCounterElement) { attemptCounterElement.textContent = `Feil svar. Forsøk igjen: ${attemptsLeft > 0 ? attemptsLeft : 0}`; } if (feedbackElement) { feedbackElement.textContent = 'Feil svar, prøv igjen.'; feedbackElement.classList.add('error', 'shake'); } if (taskInput) { taskInput.classList.add('shake'); setTimeout(() => taskInput.classList.remove('shake'), 400); taskInput.focus(); taskInput.select(); } if(feedbackElement) setTimeout(() => feedbackElement.classList.remove('shake'), 400); if (currentTeamData.taskAttempts[postNumGlobal] >= MAX_ATTEMPTS_PER_TASK) { if (feedbackElement) { feedbackElement.textContent = `Ingen flere forsøk. Går videre... (0 poeng for denne)`; feedbackElement.className = 'feedback error'; } if (taskInput) taskInput.disabled = true; if (taskButton) taskButton.disabled = true; if (!currentTeamData.completedGlobalPosts) currentTeamData.completedGlobalPosts = {}; if (!currentTeamData.completedGlobalPosts[postNumGlobal]) { currentTeamData.completedGlobalPosts[postNumGlobal] = true; currentTeamData.completedPostsCount++; } await saveState(); updateScoreDisplay(); proceedToNextPostOrFinish(); } else { await saveState(); updateScoreDisplay(); } } }


// === AUTHENTICATION LOGIC ===
// Registreringsfunksjon er fjernet. Brukere opprettes manuelt i Firebase Console.
async function loginTeam(teamName, password) {
    const authFeedback = document.getElementById('auth-feedback');
    authFeedback.className = 'feedback';
    authFeedback.textContent = 'Logger inn...';

    const email = teamName.toUpperCase() + FICTITIOUS_DOMAIN; // Konverter LAG1 -> LAG1@rebus.game

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // currentUser settes av onAuthStateChanged
        console.log("Bruker logget inn via loginTeam:", userCredential.user.uid);
        authFeedback.textContent = 'Innlogging vellykket! Laster rebus...';
        authFeedback.classList.add('success');
        // onAuthStateChanged vil håndtere resten (laste data, oppdatere UI)
    } catch (error) {
        console.error("Feil ved innlogging:", error);
        let message = "Feil ved innlogging.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "Ugyldig lagnavn eller passord.";
        } else if (error.code === 'auth/invalid-email') {
            message = "Lagnavn-format er feil (forventet f.eks. LAG1).";
        }
        authFeedback.textContent = message;
        authFeedback.classList.add('error');
    }
}

auth.onAuthStateChanged(async (user) => {
    const authSection = document.getElementById('auth-section');
    const teamWelcomeSection = document.getElementById('team-welcome-section');
    const loggedInTeamNameSpan = document.getElementById('loggedInTeamName');

    if (user) { // Bruker er logget inn
        currentUser = user; // Viktig å sette global currentUser her
        console.log("Auth state changed: User is logged in.", user.uid, user.email);
        
        if (authSection) authSection.style.display = 'none';
        if (teamWelcomeSection) teamWelcomeSection.style.display = 'block';
        
        const hasLoadedTeamData = await loadTeamDataForUser(user);

        if (hasLoadedTeamData && currentTeamData) {
            if(loggedInTeamNameSpan && currentTeamData.name) loggedInTeamNameSpan.textContent = currentTeamData.name;
            showTabContent('rebus');
            if (currentTeamData.completedPostsCount >= TOTAL_POSTS) {
                showRebusPage('finale-page');
                if (map) updateMapMarker(null, true);
            } else {
                const currentPostArrayIndex = currentTeamData.currentPostArrayIndex || 0;
                if (currentTeamData.postSequence && currentPostArrayIndex < currentTeamData.postSequence.length) {
                    const currentExpectedPostId = currentTeamData.postSequence[currentPostArrayIndex];
                     if (document.getElementById(`post-${currentExpectedPostId}-page`)) {
                        showRebusPage(`post-${currentExpectedPostId}-page`);
                        if (map) {
                            updateMapMarker(currentExpectedPostId, false);
                            startContinuousUserPositionUpdate();
                        }
                    } else {
                        console.error(`Post page 'post-${currentExpectedPostId}-page' not found in HTML. TOTAL_POSTS might be misconfigured or HTML incomplete.`);
                        showRebusPage('finale-page'); // Fallback til finale hvis post-siden mangler
                        if (map) updateMapMarker(null, true); // Vis mål som en sikkerhetsforanstaltning
                    }
                } else {
                    console.warn("Ugyldig postsekvens eller indeks i lastet data.");
                    showRebusPage('finale-page'); // Fallback til finale
                }
            }
            updateScoreDisplay();
        } else {
            // Bruker er logget inn, men ingen team data funnet (eller korrupt) for deres UID.
            console.warn(`User ${user.email} logged in, but no valid team data found in Firestore for UID ${user.uid}.`);
            if(loggedInTeamNameSpan) loggedInTeamNameSpan.textContent = user.email; // Vis e-post som placeholder
            // Vis en feilmelding eller en "venter på data"-skjerm. For nå, la dem se velkomstmeldingen
            // men ingen rebus starter. De bør kontakte arrangør.
            showRebusPage('intro-page'); // Gå tilbake til en "trygg" side, selv om auth-delen er skjult
             if (document.getElementById('auth-feedback')) {
                document.getElementById('auth-feedback').textContent = "Teamdata ikke funnet. Kontakt arrangør.";
                document.getElementById('auth-feedback').className = 'feedback error';
            }
            // Skjul rebus-spesifikk UI
            if (document.getElementById('score-display')) document.getElementById('score-display').style.display = 'none';
            // Ikke start GPS eller sett kartmarkører
        }

    } else { // Bruker er logget ut
        console.log("Auth state changed: User is logged out.");
        currentUser = null;
        currentTeamData = null;
        
        resetAllUIOnLogout(); // Nullstiller all UI, inkludert auth-skjemaet
        
        stopContinuousUserPositionUpdate();
        clearMapMarker();
        clearFinishMarker();
        if (userPositionMarker) { userPositionMarker.setMap(null); userPositionMarker = null; }
    }
});


document.addEventListener('DOMContentLoaded', async () => {
    const loginButton = document.getElementById('login-button');
    // Registreringsknapp er fjernet fra HTML, så ingen referanse her.
    const logoutButton = document.getElementById('logout-button');
    const authTeamNameInput = document.getElementById('auth-teamname-input');
    const authPasswordInput = document.getElementById('auth-password-input');
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const devResetButtons = document.querySelectorAll('.dev-reset-button');

    if (loginButton && authTeamNameInput && authPasswordInput) {
        loginButton.addEventListener('click', () => {
            const teamName = authTeamNameInput.value;
            const password = authPasswordInput.value;
            if (!teamName || !password) {
                const feedback = document.getElementById('auth-feedback');
                if(feedback) {
                    feedback.textContent = "Fyll inn både lagnavn og passord.";
                    feedback.className = 'feedback error';
                }
                return;
            }
            loginTeam(teamName, password);
        });
        // Enter-key for auth-form
        [authTeamNameInput, authPasswordInput].forEach(input => {
            input.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (loginButton) loginButton.click(); 
                }
            });
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                console.log("Logout button clicked. Signing out...");
                await auth.signOut();
                // onAuthStateChanged vil håndtere UI-oppdateringer
            } catch (error) {
                console.error("Feil ved utlogging via knapp:", error);
                alert("Utloggingsfeil: " + error.message);
            }
        });
    }
    
    // Event listeners for Post Unlock og Task Check (som før)
    document.querySelectorAll('.unlock-post-btn').forEach(button => { /* ... som i v7 ... */ button.addEventListener('click', async () => { const postNum = button.getAttribute('data-post'); const input = document.getElementById(`post-${postNum}-unlock-input`); if (input) await handlePostUnlock(postNum, input.value.trim().toUpperCase()); }); });
    document.querySelectorAll('.check-task-btn').forEach(button => { /* ... som i v7 ... */ button.addEventListener('click', async () => { const postNum = button.getAttribute('data-post'); const input = document.getElementById(`post-${postNum}-task-input`); if (input) await handleTaskCheck(postNum, input.value.trim().toUpperCase()); }); });
    document.querySelectorAll('input[type="text"]').forEach(inputField => { if (inputField.id.startsWith('auth-')) return; inputField.addEventListener('keypress', async function(event) { if (event.key === 'Enter') { event.preventDefault(); if (this.id && this.id.includes('-unlock-input')) { const postNum = this.id.split('-')[1]; const unlockButton = document.querySelector(`.unlock-post-btn[data-post="${postNum}"]`); if (unlockButton && !unlockButton.disabled) unlockButton.click(); } else if (this.id && this.id.includes('-task-input')) { const postNum = this.id.split('-')[1]; const taskButton = document.querySelector(`.check-task-btn[data-post="${postNum}"]`); if (taskButton && !taskButton.disabled) taskButton.click(); } } }); });
    
    // Event listeners for Tabs (som før)
    tabButtons.forEach(button => { /* ... som i v7 ... */ button.addEventListener('click', () => { const tabId = button.getAttribute('data-tab'); showTabContent(tabId); if (tabId === 'map' && map && currentTeamData) { let targetLocation; if (currentTeamData.completedPostsCount < TOTAL_POSTS) { const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex]; targetLocation = POST_LOCATIONS[currentPostGlobalId - 1]; } else { targetLocation = FINISH_LOCATION; } if (targetLocation) { let bounds = new google.maps.LatLngBounds(); bounds.extend(new google.maps.LatLng(targetLocation.lat, targetLocation.lng)); if (userPositionMarker && userPositionMarker.getPosition()) { bounds.extend(userPositionMarker.getPosition()); map.fitBounds(bounds); if (map.getZoom() > 18) map.setZoom(18); } else { map.panTo(new google.maps.LatLng(targetLocation.lat, targetLocation.lng)); map.setZoom(18); } } } }); });

    devResetButtons.forEach(button => {
        button.addEventListener('click', async () => {
            if (currentUser) {
                if (confirm("Vil du logge ut og nullstille all fremgang for dette laget? (Data i databasen nullstilles, men laget slettes ikke).")) {
                    await resetProgressForCurrentTeam(); // Nullstiller data i DB
                    await auth.signOut(); // Logger så ut. onAuthStateChanged håndterer UI.
                }
            } else {
                alert("Ingen bruker er logget inn. Kan ikke nullstille fremgang.");
                resetAllUIOnLogout(); // Nullstill bare UI
            }
        });
    });
    
    // Sørg for at login-skjermen vises som standard hvis ingen er logget inn ved første last
    // onAuthStateChanged vil ta over kort tid etter.
    if (!auth.currentUser) {
        resetAllUIOnLogout();
        showTabContent('rebus');
        showRebusPage('intro-page');
    }
    console.log("DOM content loaded. Auth listener is active.");
});
/* Version: #8 */

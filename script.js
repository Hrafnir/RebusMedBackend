/* Version: #6 */

// === GLOBALE VARIABLER ===
let map;
let currentMapMarker;
let userPositionMarker;
let mapElement;
let currentTeamData; // Initialiseres ikke her lenger, settes asynkront av loadState
let mapPositionWatchId = null;
let finishMarker = null;
// 'db' og 'analytics' er globale variabler definert i index.html etter Firebase-initialisering

// === GLOBAL KONFIGURASJON ===
const TOTAL_POSTS = 2;

const POST_LOCATIONS = [
    { lat: 60.81260478331276, lng: 10.673852939210269, title: "Post 1", name: "Demonstrasjonssted Alfa"},
    { lat: 60.812993, lng: 10.672853, title: "Post 2", name: "Demonstrasjonssted Beta"}
];
const START_LOCATION = { lat: 60.8127, lng: 10.6737, title: "Startområde Demo" };
const FINISH_LOCATION = { lat: 60.8124, lng: 10.6734, title: "Mål: Lærerværelset (Plassholder)" };

const POST_UNLOCK_HINTS = {
    1: "Et sted for flygende baller.",
    2: "Arbeidslivets forpost."
};


// === GOOGLE MAPS API CALLBACK ===
window.initMap = function() {
    mapElement = document.getElementById('dynamic-map-container');
    if (!mapElement) {
        setTimeout(window.initMap, 500);
        return;
    }
    const mapStyles = [
        { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] }
    ];
    map = new google.maps.Map(mapElement, {
        center: START_LOCATION, // Start med et generelt senterpunkt
        zoom: 17,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        styles: mapStyles,
        disableDefaultUI: false,
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            mapTypeIds: [google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID]
        }
    });

    // Kartmarkør og GPS-sporing startes nå etter at loadState er fullført
    // og currentTeamData er tilgjengelig, se DOMContentLoaded.
    // Dette forhindrer feil hvis kartet laster før lagdata.
    if (currentTeamData) { // Hvis loadState allerede har kjørt og satt currentTeamData
        if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
            const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            updateMapMarker(currentPostGlobalId, false);
            startContinuousUserPositionUpdate(); // Start GPS hvis rebus er i gang
        } else if (currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            updateMapMarker(null, true); // Vis mål
        }
    }
    console.log("BUS Lærerrebus Kart initialisert (uten lydfunksjoner). Venter på lagdata for markør/GPS.");
};

// === GLOBALE KARTFUNKSJONER ===
function updateMapMarker(postGlobalId, isFinalTarget = false) {
    if (!map) {
        console.warn("Kart ikke initialisert for updateMapMarker.");
        return;
    }
    clearMapMarker();
    clearFinishMarker();

    let location;
    let markerTitle;
    let markerIconUrl;

    if (isFinalTarget) {
        location = FINISH_LOCATION;
        markerTitle = FINISH_LOCATION.title;
        markerIconUrl = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        finishMarker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: markerTitle,
            animation: google.maps.Animation.DROP,
            icon: { url: markerIconUrl }
        });
    } else {
        if (!postGlobalId || postGlobalId < 1 || postGlobalId > POST_LOCATIONS.length) {
            console.warn("Ugyldig postGlobalId for updateMapMarker:", postGlobalId);
            return;
        }
        location = POST_LOCATIONS[postGlobalId - 1];
        markerTitle = `Neste: ${location.name || location.title}`;
        markerIconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
        currentMapMarker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: markerTitle,
            animation: google.maps.Animation.DROP,
            icon: { url: markerIconUrl }
        });
    }

    if(location) {
        map.panTo({ lat: location.lat, lng: location.lng });
        if (map.getZoom() < 18) map.setZoom(18);
    }
}

function clearMapMarker() {
    if (currentMapMarker) {
        currentMapMarker.setMap(null);
        currentMapMarker = null;
    }
}

function clearFinishMarker() {
    if (finishMarker) {
        finishMarker.setMap(null);
        finishMarker = null;
    }
}

function handleGeolocationError(error) {
    let msg = "Posisjonsfeil: ";
    switch (error.code) {
        case error.PERMISSION_DENIED: msg += "Nektet."; break;
        case error.POSITION_UNAVAILABLE: msg += "Utilgjengelig."; break;
        case error.TIMEOUT: msg += "Timeout."; break;
        default: msg += "Ukjent.";
    }
    console.warn(msg);
    // Vurder å informere brukeren via UI hvis det er en vedvarende feil
}

// === KARTPOSISJON FUNKSJONER ===
function updateUserPositionOnMap(position) {
    if (!map) return;
    const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
    if (userPositionMarker) {
        userPositionMarker.setPosition(userPos);
    } else {
        userPositionMarker = new google.maps.Marker({
            position: userPos,
            map: map,
            title: "Din Posisjon",
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#1976D2",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white"
            }
        });
    }
}

function handlePositionUpdate(position) {
    updateUserPositionOnMap(position);
}

function startContinuousUserPositionUpdate() {
    if (!navigator.geolocation) {
        console.warn("Geolocation ikke støttet.");
        return;
    }
    if (mapPositionWatchId !== null) {
        console.log("GPS-sporing er allerede aktiv.");
        return; 
    }

    console.log("Starter kontinuerlig GPS posisjonssporing for kart.");
    mapPositionWatchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        (error) => {
            handleGeolocationError(error);
            // Stopp bare hvis feilen ikke er PERMISSION_DENIED, da brukeren kan ombestemme seg.
            if (error.code !== error.PERMISSION_DENIED) {
                 stopContinuousUserPositionUpdate(); 
            }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
}

function stopContinuousUserPositionUpdate() {
    if (mapPositionWatchId !== null) {
        navigator.geolocation.clearWatch(mapPositionWatchId);
        mapPositionWatchId = null;
        console.log("Stoppet kontinuerlig GPS sporing for kart.");
    }
}

// === FIREBASE STATE MANAGEMENT FUNKSJONER ===
async function saveState() {
    if (currentTeamData && currentTeamData.id) {
        try {
            console.log(`Saving state for team ${currentTeamData.id} to Firestore...`, currentTeamData);
            // Bruker JSON.parse(JSON.stringify(...)) for å sikre at kun serialiserbare data sendes,
            // og for å unngå problemer med Firestore hvis objektet har metoder eller komplekse prototyper.
            await db.collection('teams').doc(currentTeamData.id).set(JSON.parse(JSON.stringify(currentTeamData)));
            console.log("State saved to Firestore successfully.");
        } catch (error) {
            console.error("Error saving state to Firestore: ", error);
            alert("En feil oppstod under lagring av fremgang. Sjekk konsollen og prøv igjen. Hvis problemet vedvarer, kontakt arrangør.");
        }
    } else {
        console.warn("No currentTeamData or team ID to save. State not saved.");
    }
}

async function loadState() {
    const activeTeamId = localStorage.getItem('activeTeamId');
    if (!activeTeamId) {
        console.log("No active team ID in localStorage. No state to load.");
        currentTeamData = null;
        return false;
    }

    try {
        console.log(`Attempting to load state for team ${activeTeamId} from Firestore...`);
        const docRef = db.collection('teams').doc(activeTeamId);
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            currentTeamData = docSnap.data();
            console.log("State loaded from Firestore:", currentTeamData);

            // Validering av lastet state
            if (!currentTeamData || typeof currentTeamData.id !== 'string' ||
                typeof currentTeamData.completedPostsCount !== 'number' ||
                !Array.isArray(currentTeamData.postSequence) ||
                typeof currentTeamData.unlockedPosts !== 'object' || currentTeamData.unlockedPosts === null ||
                typeof currentTeamData.score !== 'number' ||
                typeof currentTeamData.taskAttempts !== 'object' || currentTeamData.taskAttempts === null ||
                currentTeamData.postSequence.length > TOTAL_POSTS ) {
                console.warn("Loaded data from Firestore is corrupt or missing key values. Resetting local state and activeTeamId.");
                currentTeamData = null;
                localStorage.removeItem('activeTeamId');
                return false;
            }
            return true; // Data lastet og validert
        } else {
            console.log(`No data found in Firestore for team ${activeTeamId}. Clearing local activeTeamId.`);
            currentTeamData = null;
            localStorage.removeItem('activeTeamId'); // Viktig: fjern ID hvis det ikke er data
            return false;
        }
    } catch (error) {
        console.error("Error loading state from Firestore: ", error);
        currentTeamData = null;
        // Vurder å fjerne activeTeamId her også, avhengig av feiltype
        // localStorage.removeItem('activeTeamId'); 
        alert("En feil oppstod under lasting av lagret fremgang. Sjekk konsollen.");
        return false;
    }
}

async function clearState() {
    const activeTeamId = localStorage.getItem('activeTeamId');
    if (activeTeamId) {
        try {
            console.log(`Attempting to delete team data for ${activeTeamId} from Firestore...`);
            await db.collection('teams').doc(activeTeamId).delete();
            console.log(`Team data for ${activeTeamId} deleted from Firestore.`);
        } catch (error) {
            console.error(`Error deleting team data for ${activeTeamId} from Firestore: `, error);
            alert("En feil oppstod under sletting av data fra databasen. Sjekk konsollen.");
            // Fortsett med lokal sletting uansett
        }
    }
    localStorage.removeItem('activeTeamId');
    currentTeamData = null;

    // UI Reset
    resetAllPostUIs(); // Denne defineres lenger nede
    clearMapMarker();
    clearFinishMarker();
    if (userPositionMarker) {
        userPositionMarker.setMap(null);
        userPositionMarker = null;
    }
    stopContinuousUserPositionUpdate();
    const scoreDisplay = document.getElementById('score-display');
    if(scoreDisplay) scoreDisplay.style.display = 'none';
    console.log("Local state, UI, and (if previously active) Firestore data cleared.");
}


document.addEventListener('DOMContentLoaded', async () => {
    const teamCodeInput = document.getElementById('team-code-input');
    const startWithTeamCodeButton = document.getElementById('start-with-team-code-button');
    const teamCodeFeedback = document.getElementById('team-code-feedback');
    const pages = document.querySelectorAll('#rebus-content .page');
    const unlockPostButtons = document.querySelectorAll('.unlock-post-btn');
    const checkTaskButtons = document.querySelectorAll('.check-task-btn');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const devResetButtons = document.querySelectorAll('.dev-reset-button');
    const scoreDisplayElement = document.getElementById('score-display');
    const currentScoreSpan = document.getElementById('current-score');
    const finalScoreSpan = document.getElementById('final-score');

    const TEAM_CONFIG = {
        "LAG1": { name: "Lag 1", postSequence: [1, 2] }, // startPostId fjernet, bestemmes av postSequence[0]
        "LAG2": { name: "Lag 2", postSequence: [2, 1] }
    };
    const POST_UNLOCK_CODES = {
        1: "PEDAGOG", // Nøkler som tall for enklere oppslag
        2: "LÆRING"
    };
    const CORRECT_TASK_ANSWERS = {
        1: "RICHARD HØGÅS", // Nøkler som tall
        2: "KNUT PHARO"
    };
    const MAX_ATTEMPTS_PER_TASK = 5;
    const POINTS_PER_CORRECT_TASK = 5;

    // === KJERNEFUNKSJONER (DOM-avhengige) ===
    function updateScoreDisplay() {
        if (currentTeamData && scoreDisplayElement && currentScoreSpan) {
            currentScoreSpan.textContent = currentTeamData.score;
            scoreDisplayElement.style.display = 'block';
        }
        if (finalScoreSpan && currentTeamData) {
            finalScoreSpan.textContent = currentTeamData.score;
        }
    }

    function updatePageText(pageElement, teamPostNumber, globalPostId) {
        const titleElement = pageElement.querySelector('.post-title-placeholder');
        const introElement = pageElement.querySelector('.post-intro-placeholder');

        if (titleElement) {
            titleElement.textContent = `Oppdrag ${teamPostNumber} av ${TOTAL_POSTS}: Ankomstkode`;
            if (teamPostNumber === TOTAL_POSTS) {
                titleElement.textContent = `Siste Oppdrag (${teamPostNumber} av ${TOTAL_POSTS}): Ankomstkode`;
            }
        }

        if (introElement) {
            const postDetails = POST_LOCATIONS[globalPostId - 1];
            const postName = postDetails ? postDetails.name : `Post ${globalPostId}`;
            const commonInstruction = "Bruk kartet for å finne poststedet. Der finner dere ankomstkoden.";
            const specificHint = POST_UNLOCK_HINTS[globalPostId] ? ` Hint: ${POST_UNLOCK_HINTS[globalPostId]}` : "";
            
            introElement.textContent = `Velkommen til ${postName}. ${commonInstruction}${specificHint}`;
            if (teamPostNumber === TOTAL_POSTS) {
                introElement.textContent = `Dette er siste oppgave før målgang! Velkommen til ${postName}. ${commonInstruction}${specificHint}`;
            }
        }
    }

    function showRebusPage(pageId) {
        pages.forEach(page => page.classList.remove('visible'));
        const nextPageElement = document.getElementById(pageId);
        if (nextPageElement) {
            nextPageElement.classList.add('visible');
            const container = document.querySelector('.container');
            if (container) window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });

            if (currentTeamData && pageId.startsWith('post-')) {
                const globalPostNum = parseInt(pageId.split('-')[1]);
                if (!isNaN(globalPostNum) && currentTeamData.postSequence) {
                    const teamPostNum = currentTeamData.postSequence.indexOf(globalPostNum) + 1;
                    if (teamPostNum > 0) {
                        updatePageText(nextPageElement, teamPostNum, globalPostNum);
                    } else {
                        console.warn(`Global post ${globalPostNum} ikke funnet i lagets sekvens:`, currentTeamData.postSequence);
                    }
                }
            }
            resetPageUI(pageId);

            if (currentTeamData && pageId !== 'intro-page' && pageId !== 'finale-page') {
                updateScoreDisplay();
            } else if (scoreDisplayElement && pageId !== 'finale-page') {
                scoreDisplayElement.style.display = 'none';
            }

            if (pageId === 'finale-page' && finalScoreSpan && currentTeamData) {
                finalScoreSpan.textContent = currentTeamData.score;
            }
        } else {
            console.error("Side ikke funnet:", pageId, "Fallback til intro-siden.");
            const intro = document.getElementById('intro-page');
            if(intro) intro.classList.add('visible');
        }
    }

    function showTabContent(tabId) {
        tabContents.forEach(content => content.classList.remove('visible'));
        const nextContent = document.getElementById(tabId + '-content');
        if (nextContent) nextContent.classList.add('visible');
        else console.error("Tab-innhold ikke funnet:", tabId + '-content');

        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-tab') === tabId) button.classList.add('active');
        });
    }

    function resetPageUI(pageId) {
        if (pageId === 'intro-page' || pageId === 'finale-page') return;

        const postNumberMatch = pageId.match(/post-(\d+)-page/);
        if (!postNumberMatch) return;
        const postNumStr = postNumberMatch[1];
        const postNumGlobal = parseInt(postNumStr);

        const pageElement = document.getElementById(pageId);
        if (!pageElement) return;

        const unlockSection = pageElement.querySelector('.post-unlock-section');
        const taskSection = pageElement.querySelector('.post-task-section');
        const unlockInput = document.getElementById(`post-${postNumStr}-unlock-input`);
        const unlockButton = pageElement.querySelector('.unlock-post-btn');
        const unlockFeedback = document.getElementById(`feedback-unlock-${postNumStr}`);
        const taskInput = document.getElementById(`post-${postNumStr}-task-input`);
        const taskButton = pageElement.querySelector('.check-task-btn');
        const taskFeedback = document.getElementById(`feedback-task-${postNumStr}`);
        const attemptCounterElement = document.getElementById(`attempts-${postNumStr}`);
        if (attemptCounterElement) attemptCounterElement.textContent = '';

        const isPostUnlocked = currentTeamData?.unlockedPosts?.[postNumGlobal]; // Bruk tall-nøkkel
        const isTaskCompleted = currentTeamData?.completedGlobalPosts?.[postNumGlobal]; // Bruk tall-nøkkel

        if (unlockSection && taskSection) {
            if (isTaskCompleted) {
                unlockSection.style.display = 'none';
                taskSection.style.display = 'block';
                if (taskInput) { taskInput.disabled = true; /* taskInput.value = 'Fullført'; */ }
                if (taskButton) taskButton.disabled = true;
                if (taskFeedback) { taskFeedback.textContent = 'Oppgave fullført!'; taskFeedback.className = 'feedback success'; }
                if (attemptCounterElement) attemptCounterElement.textContent = '';
            } else if (isPostUnlocked) {
                unlockSection.style.display = 'none';
                taskSection.style.display = 'block';
                if (taskInput) { taskInput.disabled = false; taskInput.value = ''; }
                if (taskButton) taskButton.disabled = false;
                if (taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; }
                if (attemptCounterElement && currentTeamData?.taskAttempts?.[postNumGlobal] !== undefined) {
                    const attemptsLeft = MAX_ATTEMPTS_PER_TASK - currentTeamData.taskAttempts[postNumGlobal];
                    attemptCounterElement.textContent = `Forsøk igjen: ${attemptsLeft > 0 ? attemptsLeft : 0}`;
                } else if (attemptCounterElement) {
                    attemptCounterElement.textContent = `Forsøk igjen: ${MAX_ATTEMPTS_PER_TASK}`;
                }
            } else {
                unlockSection.style.display = 'block';
                taskSection.style.display = 'none';
                if (unlockInput) { unlockInput.disabled = false; unlockInput.value = ''; }
                if (unlockButton) unlockButton.disabled = false;
                if (unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; }
            }
        }
    }

    function resetAllPostUIs() {
        for (let i = 1; i <= TOTAL_POSTS; i++) {
            const pageElement = document.getElementById(`post-${i}-page`);
            if (!pageElement) continue;

            const unlockSection = pageElement.querySelector('.post-unlock-section');
            const taskSection = pageElement.querySelector('.post-task-section');
            const unlockInput = document.getElementById(`post-${i}-unlock-input`);
            const unlockButton = pageElement.querySelector('.unlock-post-btn');
            const unlockFeedback = document.getElementById(`feedback-unlock-${i}`);
            const taskInput = document.getElementById(`post-${i}-task-input`);
            const taskButton = pageElement.querySelector('.check-task-btn');
            const taskFeedback = document.getElementById(`feedback-task-${i}`);
            const attemptCounterElement = document.getElementById(`attempts-${i}`);

            if (unlockSection) unlockSection.style.display = 'block';
            if (taskSection) taskSection.style.display = 'none';
            if (unlockInput) { unlockInput.value = ''; unlockInput.disabled = false; }
            if (unlockButton) unlockButton.disabled = false;
            if (unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; }
            if (taskInput) { taskInput.value = ''; taskInput.disabled = false; }
            if (taskButton) taskButton.disabled = false;
            if (taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; }
            if (attemptCounterElement) attemptCounterElement.textContent = '';

            const titlePlaceholder = pageElement.querySelector('.post-title-placeholder');
            if (titlePlaceholder) titlePlaceholder.textContent = `Post ${i}: Ankomstkode`;
            const introPlaceholder = pageElement.querySelector('.post-intro-placeholder');
            if (introPlaceholder) introPlaceholder.textContent = "Finn ankomstkoden på stedet for å låse opp oppgaven.";
        }
        if (teamCodeInput) teamCodeInput.value = '';
        if (teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback'; }
    }

    async function initializeTeam(teamCode) {
        const teamKey = teamCode.trim().toUpperCase();
        const config = TEAM_CONFIG[teamKey];
        if (teamCodeFeedback) {
            teamCodeFeedback.className = 'feedback';
            teamCodeFeedback.textContent = '';
        }

        if (config) {
            currentTeamData = {
                id: teamKey,
                name: config.name,
                postSequence: [...config.postSequence], // Kopier arrayet
                currentPostArrayIndex: 0,
                completedPostsCount: 0,
                completedGlobalPosts: {},
                unlockedPosts: {},
                score: 0,
                taskAttempts: {}
            };

            localStorage.setItem('activeTeamId', teamKey);
            await saveState();

            resetAllPostUIs();
            clearFinishMarker();
            updateScoreDisplay();

            const firstPostInSequence = currentTeamData.postSequence[0];
            showRebusPage(`post-${firstPostInSequence}-page`);

            if (map) {
                updateMapMarker(firstPostInSequence, false);
                startContinuousUserPositionUpdate();
            } else {
                console.warn("Kart ikke klart ved lagstart. Markør og GPS startes når kartet er klart.");
            }
            console.log(`Team ${currentTeamData.name} startet! Deres ${currentTeamData.currentPostArrayIndex + 1}. post (globalt: ${firstPostInSequence})`);
        } else {
            if (teamCodeFeedback) {
                teamCodeFeedback.textContent = 'Ugyldig gruppekode!';
                teamCodeFeedback.classList.add('error', 'shake');
                setTimeout(() => teamCodeFeedback.classList.remove('shake'), 400);
            }
            if (teamCodeInput) {
                teamCodeInput.classList.add('shake');
                setTimeout(() => teamCodeInput.classList.remove('shake'), 400);
                teamCodeInput.focus();
                teamCodeInput.select();
            }
        }
    }

    async function handlePostUnlock(postNumStr, userAnswer) {
        const postNumGlobal = parseInt(postNumStr);
        const unlockInput = document.getElementById(`post-${postNumStr}-unlock-input`);
        const feedbackElement = document.getElementById(`feedback-unlock-${postNumStr}`);
        const unlockButton = document.querySelector(`#post-${postNumStr}-page .unlock-post-btn`);

        if (!currentTeamData) {
            if (feedbackElement) { feedbackElement.textContent = 'Feil: Gruppe ikke startet.'; feedbackElement.className = 'feedback error'; }
            return;
        }

        const correctUnlockCode = POST_UNLOCK_CODES[postNumGlobal];
        if (feedbackElement) { feedbackElement.className = 'feedback'; feedbackElement.textContent = ''; }

        if (!userAnswer) {
            if (feedbackElement) { feedbackElement.textContent = 'Skriv ankomstkoden!'; feedbackElement.classList.add('error', 'shake'); }
            if (unlockInput) unlockInput.classList.add('shake');
            setTimeout(() => {
                if (feedbackElement) feedbackElement.classList.remove('shake');
                if (unlockInput) unlockInput.classList.remove('shake');
            }, 400);
            return;
        }

        if (userAnswer === correctUnlockCode?.toUpperCase() || userAnswer === 'ÅPNE') { // Sjekk om correctUnlockCode finnes
            if (feedbackElement) { feedbackElement.textContent = 'Post låst opp! Her er oppgaven:'; feedbackElement.classList.add('success'); }
            if (unlockInput) unlockInput.disabled = true;
            if (unlockButton) unlockButton.disabled = true;

            if (!currentTeamData.unlockedPosts) currentTeamData.unlockedPosts = {};
            currentTeamData.unlockedPosts[postNumGlobal] = true;
            if (!currentTeamData.taskAttempts) currentTeamData.taskAttempts = {};
            currentTeamData.taskAttempts[postNumGlobal] = 0;

            await saveState();
            setTimeout(() => {
                resetPageUI(`post-${postNumGlobal}-page`);
                updateScoreDisplay();
            }, 800);
        } else {
            if (feedbackElement) { feedbackElement.textContent = 'Feil ankomstkode. Prøv igjen!'; feedbackElement.classList.add('error', 'shake'); }
            if (unlockInput) {
                unlockInput.classList.add('shake');
                setTimeout(() => unlockInput.classList.remove('shake'), 400);
                unlockInput.focus();
                unlockInput.select();
            }
           if(feedbackElement) setTimeout(() => feedbackElement.classList.remove('shake'), 400);
        }
    }

    function proceedToNextPostOrFinish() { // Tar ikke lenger argument, bruker currentTeamData
        currentTeamData.currentPostArrayIndex++;
        // saveState() er kalt i handleTaskCheck før denne.

        if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
            if (currentTeamData.currentPostArrayIndex < currentTeamData.postSequence.length) {
                const nextPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
                setTimeout(() => {
                    showRebusPage(`post-${nextPostGlobalId}-page`);
                    if (map) updateMapMarker(nextPostGlobalId, false);
                }, 1200);
            } else {
                console.warn("Færre enn TOTAL_POSTS fullført, men ingen flere poster i sekvensen. Viser finale.");
                setTimeout(() => {
                    showRebusPage('finale-page');
                    if (map) updateMapMarker(null, true);
                    stopContinuousUserPositionUpdate();
                }, 1200);
            }
        } else {
            setTimeout(() => {
                showRebusPage('finale-page');
                if (map) updateMapMarker(null, true);
                stopContinuousUserPositionUpdate();
            }, 1200);
        }
    }

    async function handleTaskCheck(postNumStr, userAnswer) {
        const postNumGlobal = parseInt(postNumStr);
        const taskInput = document.getElementById(`post-${postNumStr}-task-input`);
        const feedbackElement = document.getElementById(`feedback-task-${postNumStr}`);
        const attemptCounterElement = document.getElementById(`attempts-${postNumStr}`);
        const taskButton = document.querySelector(`#post-${postNumStr}-page .check-task-btn`);

        if (!currentTeamData) {
            if (feedbackElement) { feedbackElement.textContent = 'Feil: Gruppe ikke startet.'; feedbackElement.className = 'feedback error'; }
            return;
        }

        const correctTaskAnswer = CORRECT_TASK_ANSWERS[postNumGlobal];
        if (feedbackElement) { feedbackElement.className = 'feedback'; feedbackElement.textContent = ''; }

        if (!userAnswer) {
            if (feedbackElement) { feedbackElement.textContent = 'Svar på oppgaven!'; feedbackElement.classList.add('error', 'shake'); }
            if (taskInput) taskInput.classList.add('shake');
            setTimeout(() => {
                if (feedbackElement) feedbackElement.classList.remove('shake');
                if (taskInput) taskInput.classList.remove('shake');
            }, 400);
            return;
        }

        const isCorrect = (userAnswer.toUpperCase() === correctTaskAnswer?.toUpperCase() || userAnswer.toUpperCase() === 'FASIT');

        if (!currentTeamData.taskAttempts) currentTeamData.taskAttempts = {};
        if (currentTeamData.taskAttempts[postNumGlobal] === undefined) {
            currentTeamData.taskAttempts[postNumGlobal] = 0;
        }

        if (isCorrect) {
            if (feedbackElement) {
                feedbackElement.textContent = userAnswer.toUpperCase() === 'FASIT' ? 'FASIT godkjent! (Ingen poeng)' : 'Korrekt svar!';
                feedbackElement.classList.add('success');
            }
            if (taskInput) taskInput.disabled = true;
            if (taskButton) taskButton.disabled = true;

            if (userAnswer.toUpperCase() !== 'FASIT') {
                let pointsAwarded = POINTS_PER_CORRECT_TASK - (currentTeamData.taskAttempts[postNumGlobal] || 0);
                currentTeamData.score += Math.max(0, pointsAwarded);
            }

            if (!currentTeamData.completedGlobalPosts) currentTeamData.completedGlobalPosts = {};
            if (!currentTeamData.completedGlobalPosts[postNumGlobal]) {
                currentTeamData.completedGlobalPosts[postNumGlobal] = true;
                currentTeamData.completedPostsCount++;
            }
            await saveState();
            updateScoreDisplay();
            proceedToNextPostOrFinish();
        } else {
            currentTeamData.taskAttempts[postNumGlobal]++;
            const attemptsLeft = MAX_ATTEMPTS_PER_TASK - currentTeamData.taskAttempts[postNumGlobal];

            if (attemptCounterElement) {
                attemptCounterElement.textContent = `Feil svar. Forsøk igjen: ${attemptsLeft > 0 ? attemptsLeft : 0}`;
            }
            if (feedbackElement) { feedbackElement.textContent = 'Feil svar, prøv igjen.'; feedbackElement.classList.add('error', 'shake'); }
            if (taskInput) {
                taskInput.classList.add('shake');
                setTimeout(() => taskInput.classList.remove('shake'), 400);
                taskInput.focus();
                taskInput.select();
            }
            if(feedbackElement) setTimeout(() => feedbackElement.classList.remove('shake'), 400);


            if (currentTeamData.taskAttempts[postNumGlobal] >= MAX_ATTEMPTS_PER_TASK) {
                if (feedbackElement) {
                    feedbackElement.textContent = `Ingen flere forsøk. Går videre... (0 poeng for denne)`;
                    feedbackElement.className = 'feedback error';
                }
                if (taskInput) taskInput.disabled = true;
                if (taskButton) taskButton.disabled = true;

                if (!currentTeamData.completedGlobalPosts) currentTeamData.completedGlobalPosts = {};
                if (!currentTeamData.completedGlobalPosts[postNumGlobal]) {
                    currentTeamData.completedGlobalPosts[postNumGlobal] = true;
                    currentTeamData.completedPostsCount++;
                }
                await saveState();
                updateScoreDisplay();
                proceedToNextPostOrFinish();
            } else {
                await saveState(); // Lagre kun oppdatert antall forsøk
                updateScoreDisplay();
            }
        }
    }

    function updateUIAfterLoad() {
        if (!currentTeamData) {
            resetAllPostUIs();
            return;
        }
        for (let i = 1; i <= TOTAL_POSTS; i++) {
            if (document.getElementById(`post-${i}-page`)) {
                resetPageUI(`post-${i}-page`);
            }
        }
        if (currentTeamData && currentTeamData.score !== undefined) {
            updateScoreDisplay();
        }
    }

    // EVENT LISTENERS (gjort async der de kaller async funksjoner)
    if (startWithTeamCodeButton && teamCodeInput) {
        startWithTeamCodeButton.addEventListener('click', async () => {
            await initializeTeam(teamCodeInput.value);
        });
        teamCodeInput.addEventListener('keypress', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await initializeTeam(teamCodeInput.value);
            }
        });
    }

    unlockPostButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const postNum = button.getAttribute('data-post');
            const unlockInput = document.getElementById(`post-${postNum}-unlock-input`);
            if (unlockInput) await handlePostUnlock(postNum, unlockInput.value.trim().toUpperCase());
        });
    });

    checkTaskButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const postNum = button.getAttribute('data-post');
            const taskInput = document.getElementById(`post-${postNum}-task-input`);
            if (taskInput) await handleTaskCheck(postNum, taskInput.value.trim().toUpperCase());
        });
    });

    document.querySelectorAll('input[type="text"]').forEach(inputField => { // Endret variabelnavn for klarhet
        inputField.addEventListener('keypress', async function(event) { // Bruk 'function' for riktig 'this'
            if (event.key === 'Enter') {
                event.preventDefault();
                if (this.id === 'team-code-input' && startWithTeamCodeButton) {
                     startWithTeamCodeButton.click(); // Lar den eksisterende async handleren ta over
                } else if (this.id && this.id.includes('-unlock-input')) {
                    const postNum = this.id.split('-')[1];
                    const unlockButton = document.querySelector(`.unlock-post-btn[data-post="${postNum}"]`);
                    if (unlockButton && !unlockButton.disabled) unlockButton.click();
                } else if (this.id && this.id.includes('-task-input')) {
                    const postNum = this.id.split('-')[1];
                    const taskButton = document.querySelector(`.check-task-btn[data-post="${postNum}"]`);
                    if (taskButton && !taskButton.disabled) taskButton.click();
                }
            }
        });
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTabContent(tabId);
            if (tabId === 'map' && map && currentTeamData) {
                let targetLocation;
                if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
                    const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
                    targetLocation = POST_LOCATIONS[currentPostGlobalId - 1];
                } else {
                    targetLocation = FINISH_LOCATION;
                }

                if (targetLocation) {
                    let bounds = new google.maps.LatLngBounds();
                    bounds.extend(new google.maps.LatLng(targetLocation.lat, targetLocation.lng));
                    if (userPositionMarker && userPositionMarker.getPosition()) {
                        bounds.extend(userPositionMarker.getPosition());
                        map.fitBounds(bounds);
                        if (map.getZoom() > 18) map.setZoom(18);
                    } else {
                         map.panTo(new google.maps.LatLng(targetLocation.lat, targetLocation.lng));
                         map.setZoom(18);
                    }
                }
            }
        });
    });

    devResetButtons.forEach(button => {
        button.addEventListener('click', async () => {
            if (confirm("Nullstille demo? Dette sletter all fremgang (også fra databasen for dette laget).")) {
                await clearState();
                showRebusPage('intro-page');
                if (teamCodeInput) { teamCodeInput.value = ''; teamCodeInput.disabled = false; }
                if (teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback'; }
                if (startWithTeamCodeButton) startWithTeamCodeButton.disabled = false;
            }
        });
    });

    // === INITALISERING VED LASTING AV SIDE ===
    const hasLoadedState = await loadState();

    if (hasLoadedState && currentTeamData) {
        showTabContent('rebus');
        if (currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            showRebusPage('finale-page');
            if (map) updateMapMarker(null, true);
        } else {
            const currentPostArrayIndex = currentTeamData.currentPostArrayIndex || 0; // Sikkerhet
            if (currentTeamData.postSequence && currentPostArrayIndex < currentTeamData.postSequence.length) {
                const currentExpectedPostId = currentTeamData.postSequence[currentPostArrayIndex];
                if (typeof currentExpectedPostId !== 'undefined' && document.getElementById(`post-${currentExpectedPostId}-page`)) {
                    showRebusPage(`post-${currentExpectedPostId}-page`);
                    if (map) { // Hvis kartet er klart
                        updateMapMarker(currentExpectedPostId, false);
                        startContinuousUserPositionUpdate();
                    }
                } else {
                    console.warn(`Ugyldig post-ID (${currentExpectedPostId}) eller side mangler i lastet state. Nullstiller lokalt.`);
                    localStorage.removeItem('activeTeamId'); currentTeamData = null;
                    showRebusPage('intro-page'); resetAllPostUIs();
                }
            } else {
                 console.warn("Postsekvens er ugyldig eller tom i lastet state. Nullstiller lokalt.");
                 localStorage.removeItem('activeTeamId'); currentTeamData = null;
                 showRebusPage('intro-page'); resetAllPostUIs();
            }
        }
        updateUIAfterLoad();
        console.log(`Gjenopprettet tilstand for ${currentTeamData.name}.`);
        // GPS startes nå enten her hvis kartet er klart, eller i initMap callback
    } else {
        showTabContent('rebus');
        showRebusPage('intro-page');
        resetAllPostUIs();
    }
});
/* Version: #6 */

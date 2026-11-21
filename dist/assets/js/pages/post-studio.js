"use strict";
// @ts-nocheck
/* Existing tool-generation and Firebase history logic migrated to TypeScript. API payloads and endpoint contracts are preserved. */
// --- CUSTOM THEME DESIGN SYSTEM TOKENS SCHEMA INITIALIZATION ---
// --- CONNECTIVE INFRASTRUCTURE DATA REPOSITORY STACK CONFIGURATIONS ---
const firebaseConfig = {
    apiKey: "AIzaSyAlixKQr90Wn2u1kOkE7erppf7omed5KXU",
    authDomain: "quans-175a2.firebaseapp.com",
    projectId: "quans-175a2",
    storageBucket: "quans-175a2.firebasestorage.app",
    messagingSenderId: "221298439204",
    appId: "1:221298439204:web:47b39c005411c979ca54b1",
    measurementId: "G-J6EZ37W65Y"
};
if (!firebase.apps.length)
    firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// Runtime Global Variable Registration Parameter State Mapping Objects
let currentUserObject = null;
let generationLogsCacheArray = [];
let globalActiveSearchQueryToken = "";
let activeGeneratedPostObject = null;
// Object Tracking Active Values For Custom Dropdowns Selection Architecture
const activeFormStateModel = {
    platform: "LinkedIn",
    tone: "Professional",
    audience: "Developers",
    goal: "Get comments",
    length: "Short"
};
// DOM Elements Map Pointer Directory Configuration Objects
const profileTriggerBtn = document.getElementById('profileTriggerBtn');
const profileDropdownMenu = document.getElementById('profileDropdownMenu');
const logoutActionBtn = document.getElementById('logoutActionBtn');
const userHelloDisplay = document.getElementById('userHelloDisplay');
const topicInputField = document.getElementById('topicInputField');
const addCtaCheckbox = document.getElementById('addCtaCheckbox');
const generationTriggerBtn = document.getElementById('generationTriggerBtn');
const statusDotIndicator = document.getElementById('statusDotIndicator');
const statusLabelIndicator = document.getElementById('statusLabelIndicator');
const fallbackEmptyStatePanel = document.getElementById('fallbackEmptyStatePanel');
const contentRendererDisplayBlock = document.getElementById('contentRendererDisplayBlock');
const copyToClipboardBtn = document.getElementById('copyToClipboardBtn');
const copyBtnLabelText = document.getElementById('copyBtnLabelText');
const outputDisplayScreenFrame = document.getElementById('outputDisplayScreenFrame');
const desktopDropupTriggerBtn = document.getElementById('desktopDropupTriggerBtn');
const desktopDropupPanel = document.getElementById('desktopDropupPanel');
const desktopDropupIcon = document.getElementById('desktopDropupIcon');
const desktopHistorySearchBox = document.getElementById('desktopHistorySearchBox');
const desktopGenerationsScrollList = document.getElementById('desktopGenerationsScrollList');
const mobileDrawerOpenBtn = document.getElementById('mobileDrawerOpenBtn');
const mobileDrawerCloseBtn = document.getElementById('mobileDrawerCloseBtn');
const mobileSidebarDrawerOverlay = document.getElementById('mobileSidebarDrawerOverlay');
const mobileSidebarDrawerPanel = document.getElementById('mobileSidebarDrawerPanel');
const mobileHistorySearchBox = document.getElementById('mobileHistorySearchBox');
const mobileGenerationsScrollList = document.getElementById('mobileGenerationsScrollList');
// --- CUSTOM WEB WEBPAGE REPLACEMENT DROPDOWN LAYOUT MANAGEMENT LOGIC ---
function initializeCustomDropdownModules() {
    const dropdownRoots = document.querySelectorAll('.custom-dropdown-root');
    dropdownRoots.forEach(root => {
        const triggerBtn = root.querySelector('.dropdown-trigger');
        const optionsMenu = root.querySelector('.dropdown-menu-options');
        const displaySpan = root.querySelector('.selected-display-value');
        const optionItems = root.querySelectorAll('.option-item');
        const stateKey = root.id.replace('dropdown', '').replace('Root', '').toLowerCase();
        // Toggle menu on click
        triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close all other dropdown menus first
            document.querySelectorAll('.dropdown-menu-options').forEach(menu => {
                if (menu !== optionsMenu)
                    menu.classList.add('hidden');
            });
            optionsMenu.classList.toggle('hidden');
        });
        // Option selection handler logic
        optionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const chosenVal = item.getAttribute('data-value');
                displaySpan.innerText = chosenVal;
                activeFormStateModel[stateKey] = chosenVal;
                optionsMenu.classList.add('hidden');
            });
        });
    });
    // Global click capture hook layer to dismiss floating dropdown elements instantly
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu-options').forEach(menu => menu.classList.add('hidden'));
    });
}
// Helper interface method used to explicitly force dynamic visual value synchronizations across UI custom elements
function updateCustomDropdownUIValueDisplay(componentNameKey, absoluteTargetValue) {
    const rootTargetNode = document.getElementById(`dropdown${componentNameKey.charAt(0).toUpperCase() + componentNameKey.slice(1)}Root`);
    if (rootTargetNode) {
        const displaySpanNode = rootTargetNode.querySelector('.selected-display-value');
        if (displaySpanNode)
            displaySpanNode.innerText = absoluteTargetValue;
        activeFormStateModel[componentNameKey] = absoluteTargetValue;
    }
}
// --- SECURITY IDENTITY TRACKING ACCESS GUARDS MATRIX IMPLEMENTATIONS ---
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
    else {
        currentUserObject = user;
        if (user.displayName) {
            const primaryFirstNameName = user.displayName.split(' ')[0];
            userHelloDisplay.innerText = `Hello!`;
        }
        else {
            userHelloDisplay.innerText = "Hello!";
        }
        initializeCustomDropdownModules();
        syncGenerationsRealtimeDatabaseStack();
    }
});
// Dropdown User profile overlay interaction handlers
profileTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdownMenu.classList.toggle('hidden');
});
document.addEventListener('click', () => { profileDropdownMenu.classList.add('hidden'); });
logoutActionBtn.addEventListener('click', () => { auth.signOut(); });
// Desktop Dropup Component Event Layout Toggles handlers
desktopDropupTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isMenuClosed = desktopDropupPanel.classList.toggle('hidden');
    desktopDropupIcon.style.transform = !isMenuClosed ? "rotate(180deg)" : "rotate(0deg)";
});
desktopDropupPanel.addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('click', () => {
    desktopDropupPanel.classList.add('hidden');
    desktopDropupIcon.style.transform = "rotate(0deg)";
});
// Mobile Sidebar Drawer Actions Controls Interface Implementations
mobileDrawerOpenBtn.addEventListener('click', () => {
    mobileSidebarDrawerOverlay.classList.add('sidebar-overlay-active');
    mobileSidebarDrawerPanel.classList.add('sidebar-panel-active');
});
const closeMobileDrawerHandler = () => {
    mobileSidebarDrawerOverlay.classList.remove('sidebar-overlay-active');
    mobileSidebarDrawerPanel.classList.remove('sidebar-panel-active');
};
mobileDrawerCloseBtn.addEventListener('click', closeMobileDrawerHandler);
mobileSidebarDrawerOverlay.addEventListener('click', closeMobileDrawerHandler);
mobileSidebarDrawerPanel.addEventListener('click', (e) => e.stopPropagation());
// COPY OPERATIONS TRANSACTION LAYER EXECUTIONS (Copies entire constructed text block cleanly)
copyToClipboardBtn.addEventListener('click', () => {
    if (!activeGeneratedPostObject)
        return;
    const blueprintTextString = `HOOK 1:\n${activeGeneratedPostObject.hook1 || activeGeneratedPostObject.hook || ''}\n\nHOOK 2:\n${activeGeneratedPostObject.hook2 || ''}\n\nHOOK 3:\n${activeGeneratedPostObject.hook3 || ''}\n\nBODY:\n${activeGeneratedPostObject.mainPost || ''}\n\nCTA:\n${activeGeneratedPostObject.cta || ''}\n\n${activeGeneratedPostObject.hashtags || ''}`;
    navigator.clipboard.writeText(blueprintTextString).then(() => {
        copyBtnLabelText.innerText = "Copied!";
        setTimeout(() => copyBtnLabelText.innerText = "Copy Full Blueprint", 1500);
    }).catch(err => console.error("Clipboard blocking operation anomaly detected:", err));
});
function copyIndividualSegmentBlock(elementId) {
    const textToCopy = document.getElementById(elementId).innerText || document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Segment asset copied to clipboard!");
    }).catch(err => console.error("Segment copy blocked:", err));
}
// REAL-TIME FIRESTORE DATA ACQUISITION & SYNCHRONIZATION BINDINGS
function syncGenerationsRealtimeDatabaseStack() {
    if (!currentUserObject)
        return;
    db.collection('users').doc(currentUserObject.uid).collection('generations')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
        generationLogsCacheArray = [];
        snapshot.forEach(doc => {
            generationLogsCacheArray.push({ id: doc.id, ...doc.data() });
        });
        renderGenerationsListCanvasDOM();
    }, faultError => console.error("Firestore sync fault:", faultError));
}
// DYNAMIC RENDERING INTERACTIVE LOG FACTORY COMPILER LAYER OVERVIEW
function renderGenerationsListCanvasDOM() {
    const filteredArray = generationLogsCacheArray.filter(item => {
        if (!globalActiveSearchQueryToken.trim())
            return true;
        const activeMatchTokenValue = globalActiveSearchQueryToken.toLowerCase();
        return (item.title && item.title.toLowerCase().includes(activeMatchTokenValue)) ||
            (item.promptInput && item.promptInput.toLowerCase().includes(activeMatchTokenValue)) ||
            (item.platform && item.platform.toLowerCase().includes(activeMatchTokenValue));
    });
    const renderBlockFactoryHtml = (item) => `
                <div class="p-2.5 bg-white border border-slate-100 rounded-xl hover:border-brand-blue shadow-xs transition-all flex flex-col gap-1.5 group/item relative cursor-pointer" onclick="loadArchivedItemToWorkspace('${item.id}')">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5 min-w-0 flex-1">
                            <i class="fa-regular fa-file-lines text-slate-400 text-xs shrink-0"></i>
                            <input type="text" value="${item.title || 'Untitled Generation'}" 
                                class="text-xs font-bold text-slate-700 bg-transparent border-b border-transparent focus:border-brand-blue outline-none min-w-0 flex-1 cursor-text"
                                onclick="event.stopPropagation()" 
                                onchange="renameGenerationDocRecord('${item.id}', this.value)" 
                                id="titleInputNode-${item.id}">
                        </div>
                        <div class="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <button onclick="event.stopPropagation(); document.getElementById('titleInputNode-${item.id}').focus();" class="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-blue text-[10px]">
                                <i class="fa-solid fa-pencil"></i>
                            </button>
                            <button onclick="event.stopPropagation(); deleteGenerationDocRecord('${item.id}')" class="w-6 h-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 text-[10px]">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap text-[9px] font-bold encoding-metadata">
                        <span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${item.platform || 'LinkedIn'}</span>
                        <span class="bg-blue-50/50 px-1.5 py-0.5 rounded text-brand-blue">${item.tone || 'Professional'}</span>
                    </div>
                </div>
            `;
    const finalCompiledHtmlMarkup = filteredArray.length ? filteredArray.map(renderBlockFactoryHtml).join('') : `
                <div class="text-center py-8 text-slate-400 text-xs font-medium">No configuration matches located.</div>
            `;
    desktopGenerationsScrollList.innerHTML = finalCompiledHtmlMarkup;
    mobileGenerationsScrollList.innerHTML = finalCompiledHtmlMarkup;
}
// Interactive Key Ingestion Stream Handlers
desktopHistorySearchBox.addEventListener('input', (e) => {
    globalActiveSearchQueryToken = e.target.value;
    renderGenerationsListCanvasDOM();
});
mobileHistorySearchBox.addEventListener('input', (e) => {
    globalActiveSearchQueryToken = e.target.value;
    renderGenerationsListCanvasDOM();
});
// FIRESTORE RECORD WRITING CONTROLLER HOOKS INTERACTION NODES
async function renameGenerationDocRecord(docId, nextTitleValue) {
    if (!currentUserObject || !nextTitleValue.trim())
        return;
    try {
        await db.collection('users').doc(currentUserObject.uid).collection('generations').doc(docId).update({
            title: nextTitleValue.trim()
        });
    }
    catch (err) {
        console.error("Operational update abort:", err);
    }
}
async function deleteGenerationDocRecord(docId) {
    if (!currentUserObject || !confirm("Are you sure you want to delete this generation?"))
        return;
    try {
        await db.collection('users').doc(currentUserObject.uid).collection('generations').doc(docId).delete();
    }
    catch (err) {
        console.error("Deletion transaction execution rollback:", err);
    }
}
// ACTION EVENT: LOAD HISTORICAL ARCHIVE VALUE DIRECTLY TO ACTIVE SCREEN VIEWPORTS
function loadArchivedItemToWorkspace(docId) {
    const targetingMatchNode = generationLogsCacheArray.find(g => g.id === docId);
    if (!targetingMatchNode)
        return;
    // Fluid state synchronizations over our custom dropdown components
    topicInputField.value = targetingMatchNode.promptInput || "";
    updateCustomDropdownUIValueDisplay('platform', targetingMatchNode.platform || "LinkedIn");
    updateCustomDropdownUIValueDisplay('tone', targetingMatchNode.tone || "Professional");
    updateCustomDropdownUIValueDisplay('audience', targetingMatchNode.audience || "Developers");
    updateCustomDropdownUIValueDisplay('goal', targetingMatchNode.goal || "Get comments");
    updateCustomDropdownUIValueDisplay('length', targetingMatchNode.length || "Short");
    addCtaCheckbox.checked = !!targetingMatchNode.addCTA;
    // Restore brand inputs if present
    document.getElementById('brandContextInput').value = targetingMatchNode.brandContext || "";
    document.getElementById('sampleWritingStyleInput').value = targetingMatchNode.sampleWritingStyle || "";
    fallbackEmptyStatePanel.classList.add('hidden');
    contentRendererDisplayBlock.classList.remove('hidden');
    copyToClipboardBtn.classList.remove('hidden');
    outputDisplayScreenFrame.classList.remove('justify-center');
    statusDotIndicator.className = "w-2 h-2 rounded-full bg-emerald-500";
    statusLabelIndicator.innerText = `Archived Content Session Restored [${targetingMatchNode.platform || 'LinkedIn'}].`;
    try {
        const parsedObject = JSON.parse(targetingMatchNode.generatedOutput);
        activeGeneratedPostObject = parsedObject;
        renderStructuredOutput(parsedObject);
    }
    catch (e) {
        // Fallback for flat storage strings
        const fallbackObject = { hook1: targetingMatchNode.generatedOutput, hook2: "", hook3: "", mainPost: "", cta: "", hashtags: "", imageSuggestion: "" };
        activeGeneratedPostObject = fallbackObject;
        renderStructuredOutput(fallbackObject);
    }
    closeMobileDrawerHandler();
}
// STRUCTURED OBJECT VIEW BINDING INTERFACE METHOD
function renderStructuredOutput(dataObject) {
    fallbackEmptyStatePanel.classList.add('hidden');
    contentRendererDisplayBlock.classList.remove('hidden');
    copyToClipboardBtn.classList.remove('hidden');
    outputDisplayScreenFrame.classList.remove('justify-center');
    document.getElementById('generatedHookText1').innerHTML = formatTextTokenWeights(dataObject.hook1 || dataObject.hook || "None generated.");
    document.getElementById('generatedHookText2').innerHTML = formatTextTokenWeights(dataObject.hook2 || "Alternative hook option 2.");
    document.getElementById('generatedHookText3').innerHTML = formatTextTokenWeights(dataObject.hook3 || "Alternative hook option 3.");
    document.getElementById('generatedMainBodyText').innerHTML = formatTextTokenWeights(dataObject.mainPost || "None generated.");
    document.getElementById('generatedCtaText').innerHTML = formatTextTokenWeights(dataObject.cta || "");
    document.getElementById('generatedHashtags').innerText = dataObject.hashtags || "";
    document.getElementById('generatedImageSuggestion').innerText = dataObject.imageSuggestion || "";
}
function formatTextTokenWeights(rawStr) {
    return rawStr
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}
function setUIProcessingState(isLoading, customMessage = "Processing structural inputs...") {
    generationTriggerBtn.disabled = isLoading;
    generationTriggerBtn.style.opacity = isLoading ? "0.6" : "1";
    statusDotIndicator.className = isLoading ? "w-2 h-2 rounded-full bg-amber-400 animate-bounce" : "w-2 h-2 rounded-full bg-emerald-500";
    statusLabelIndicator.innerText = isLoading ? "Generating..." : "Ready";
}
// ACTION PROCESS DISPATCH: DISPATCH GENERATION CONFIGS TO SERVER ENDPOINTS
generationTriggerBtn.addEventListener('click', async () => {
    const promptValueInputString = topicInputField.value.trim();
    if (!promptValueInputString) {
        alert("Please write your core text topic configuration parameter rules first before generating content.");
        return;
    }
    setUIProcessingState(true);
    const platformToken = activeFormStateModel.platform;
    const toneToken = activeFormStateModel.tone;
    const audienceToken = activeFormStateModel.audience;
    const goalToken = activeFormStateModel.goal;
    const lengthToken = activeFormStateModel.length;
    const ctaActiveFlag = addCtaCheckbox.checked;
    const brandContextToken = document.getElementById('brandContextInput').value.trim();
    const sampleStyleToken = document.getElementById('sampleWritingStyleInput').value.trim();
    try {
        const apiPayloadResponse = await fetch('/api/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: promptValueInputString,
                platform: platformToken,
                tone: toneToken,
                audience: audienceToken,
                goal: goalToken,
                length: lengthToken,
                addCTA: ctaActiveFlag,
                brandContext: brandContextToken,
                sampleWritingStyle: sampleStyleToken
            })
        });
        if (!apiPayloadResponse.ok)
            throw new Error(`HTTP System Exception Status: ${apiPayloadResponse.status}`);
        const structuredDataPayload = await apiPayloadResponse.json();
        activeGeneratedPostObject = structuredDataPayload;
        renderStructuredOutput(structuredDataPayload);
        setUIProcessingState(false);
        statusLabelIndicator.innerText = "Generation complete. Final post asset available below.";
        // Write generated content record down to Firestore instantly if signed in
        if (currentUserObject) {
            const formattedTruncatedTitle = promptValueInputString.split('\n')[0].substring(0, 22) + "...";
            await db.collection('users').doc(currentUserObject.uid).collection('generations').add({
                title: formattedTruncatedTitle,
                promptInput: promptValueInputString,
                platform: platformToken,
                tone: toneToken,
                audience: audienceToken,
                goal: goalToken,
                length: lengthToken,
                addCTA: ctaActiveFlag,
                brandContext: brandContextToken,
                sampleWritingStyle: sampleStyleToken,
                generatedOutput: JSON.stringify(structuredDataPayload),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    catch (err) {
        console.error("Upstream communication breakdown fault:", err);
        statusDotIndicator.className = "w-2 h-2 rounded-full bg-red-500";
        statusLabelIndicator.innerText = "Fatal connection abort error. Processing failed.";
        generationTriggerBtn.disabled = false;
        generationTriggerBtn.style.opacity = "1";
        alert("Failed to connect successfully with text generation node channels. Please verify networks.");
    }
});
// QUICK-REFINE ACTION ROUTER PIPELINE HANDLER
async function handleMicroRefinement(actionKey) {
    if (!activeGeneratedPostObject) {
        alert("Generate a post configuration layout blueprint first before processing rapid variants.");
        return;
    }
    setUIProcessingState(true);
    try {
        const apiPayloadResponse = await fetch('/api/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform: activeFormStateModel.platform,
                tone: activeFormStateModel.tone,
                audience: activeFormStateModel.audience,
                goal: activeFormStateModel.goal,
                length: activeFormStateModel.length,
                addCTA: addCtaCheckbox.checked,
                refineAction: actionKey,
                existingPostContext: JSON.stringify(activeGeneratedPostObject)
            })
        });
        if (!apiPayloadResponse.ok)
            throw new Error();
        const refinedData = await apiPayloadResponse.json();
        activeGeneratedPostObject = refinedData;
        renderStructuredOutput(refinedData);
        setUIProcessingState(false);
        statusLabelIndicator.innerText = "Refinement update compiled successfully.";
    }
    catch (err) {
        console.error("Micro-refinement transaction anomaly encountered:", err);
        setUIProcessingState(false);
        statusLabelIndicator.innerText = "Failed to apply refinement modification.";
        alert("Could not update copy variants across endpoint nodes.");
    }
}
// Preserve the inline action callbacks used by the existing output controls.
window.copyIndividualSegmentBlock = copyIndividualSegmentBlock;
window.handleMicroRefinement = handleMicroRefinement;

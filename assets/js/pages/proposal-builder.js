"use strict";
// @ts-nocheck
/* Existing tool-generation and Firebase history logic migrated to TypeScript. API payloads and endpoint contracts are preserved. */
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
let currentUserObject = null;
let proposalLogsCacheArray = [];
let globalActiveSearchQueryToken = "";
let activeGeneratedProposalObject = null;
const activeFormStateModel = {
    platform: "Upwork",
    tone: "Professional",
    length: "Short"
};
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
function initializeCustomDropdownModules() {
    const dropdownRoots = document.querySelectorAll('.custom-dropdown-root');
    dropdownRoots.forEach(root => {
        const triggerBtn = root.querySelector('.dropdown-trigger');
        const optionsMenu = root.querySelector('.dropdown-menu-options');
        const displaySpan = root.querySelector('.selected-display-value');
        const optionItems = root.querySelectorAll('.option-item');
        const stateKey = root.id.replace('dropdown', '').replace('Root', '').toLowerCase();
        triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-menu-options').forEach(menu => {
                if (menu !== optionsMenu)
                    menu.classList.add('hidden');
            });
            optionsMenu.classList.toggle('hidden');
        });
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
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu-options').forEach(menu => menu.classList.add('hidden'));
    });
}
function updateCustomDropdownUIValueDisplay(componentNameKey, absoluteTargetValue) {
    const rootTargetNode = document.getElementById(`dropdown${componentNameKey.charAt(0).toUpperCase() + componentNameKey.slice(1)}Root`);
    if (rootTargetNode) {
        const displaySpanNode = rootTargetNode.querySelector('.selected-display-value');
        if (displaySpanNode)
            displaySpanNode.innerText = absoluteTargetValue;
        activeFormStateModel[componentNameKey] = absoluteTargetValue;
    }
}
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
    else {
        currentUserObject = user;
        if (userHelloDisplay)
            userHelloDisplay.innerText = `Hello, ${user.displayName || 'Creator'}`;
        initializeCustomDropdownModules();
        syncProposalsRealtimeDatabaseStack();
    }
});
if (profileTriggerBtn) {
    profileTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdownMenu.classList.toggle('hidden');
    });
}
document.addEventListener('click', () => { if (profileDropdownMenu)
    profileDropdownMenu.classList.add('hidden'); });
if (logoutActionBtn)
    logoutActionBtn.addEventListener('click', () => { auth.signOut(); });
if (desktopDropupTriggerBtn) {
    desktopDropupTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMenuClosed = desktopDropupPanel.classList.toggle('hidden');
        if (desktopDropupIcon)
            desktopDropupIcon.style.transform = !isMenuClosed ? "rotate(180deg)" : "rotate(0deg)";
    });
}
if (desktopDropupPanel)
    desktopDropupPanel.addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('click', () => {
    if (desktopDropupPanel) {
        desktopDropupPanel.classList.add('hidden');
        if (desktopDropupIcon)
            desktopDropupIcon.style.transform = "rotate(0deg)";
    }
});
if (mobileDrawerOpenBtn) {
    mobileDrawerOpenBtn.addEventListener('click', () => {
        if (mobileSidebarDrawerOverlay)
            mobileSidebarDrawerOverlay.classList.add('sidebar-overlay-active');
        if (mobileSidebarDrawerPanel)
            mobileSidebarDrawerPanel.classList.add('sidebar-panel-active');
    });
}
const closeMobileDrawerHandler = () => {
    if (mobileSidebarDrawerOverlay)
        mobileSidebarDrawerOverlay.classList.remove('sidebar-overlay-active');
    if (mobileSidebarDrawerPanel)
        mobileSidebarDrawerPanel.classList.remove('sidebar-panel-active');
};
if (mobileDrawerCloseBtn)
    mobileDrawerCloseBtn.addEventListener('click', closeMobileDrawerHandler);
if (mobileSidebarDrawerOverlay)
    mobileSidebarDrawerOverlay.addEventListener('click', closeMobileDrawerHandler);
if (mobileSidebarDrawerPanel)
    mobileSidebarDrawerPanel.addEventListener('click', (e) => e.stopPropagation());
copyToClipboardBtn.addEventListener('click', () => {
    if (!activeGeneratedProposalObject)
        return;
    let blueprintTextString = "";
    if (activeGeneratedProposalObject.subject) {
        blueprintTextString += `SUBJECT:\n${activeGeneratedProposalObject.subject}\n\n`;
    }
    blueprintTextString += `PROPOSAL:\n${activeGeneratedProposalObject.proposal || ''}`;
    if (activeGeneratedProposalObject.cta) {
        blueprintTextString += `\n\nCTA:\n${activeGeneratedProposalObject.cta}`;
    }
    navigator.clipboard.writeText(blueprintTextString).then(() => {
        copyBtnLabelText.innerText = "Copied!";
        setTimeout(() => copyBtnLabelText.innerText = "Copy Full Proposal", 1500);
    }).catch(err => console.error("Clipboard blocking execution anomaly:", err));
});
function copyIndividualSegmentBlock(elementId) {
    const textToCopy = document.getElementById(elementId).innerText || document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Segment asset copied to clipboard!");
    }).catch(err => console.error("Segment copy blocked:", err));
}
function syncProposalsRealtimeDatabaseStack() {
    if (!currentUserObject)
        return;
    db.collection('users').doc(currentUserObject.uid).collection('proposals')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
        proposalLogsCacheArray = [];
        snapshot.forEach(doc => {
            proposalLogsCacheArray.push({ id: doc.id, ...doc.data() });
        });
        renderProposalsListCanvasDOM();
    }, faultError => console.error("Firestore sync fault:", faultError));
}
function renderProposalsListCanvasDOM() {
    const filteredArray = proposalLogsCacheArray.filter(item => {
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
                            <input type="text" value="${item.title || 'Untitled Proposal'}" 
                                class="text-xs font-bold text-slate-700 bg-transparent border-b border-transparent focus:border-brand-blue outline-none min-w-0 flex-1 cursor-text"
                                onclick="event.stopPropagation()" 
                                onchange="renameProposalDocRecord('${item.id}', this.value)" 
                                id="titleInputNode-${item.id}">
                        </div>
                        <div class="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <button onclick="event.stopPropagation(); document.getElementById('titleInputNode-${item.id}').focus();" class="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-blue text-[10px]">
                                <i class="fa-solid fa-pencil"></i>
                            </button>
                            <button onclick="event.stopPropagation(); deleteProposalDocRecord('${item.id}')" class="w-6 h-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 text-[10px]">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap text-[9px] font-bold encoding-metadata">
                        <span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${item.platform || 'Upwork'}</span>
                        <span class="bg-blue-50/50 px-1.5 py-0.5 rounded text-brand-blue">${item.tone || 'Professional'}</span>
                    </div>
                </div>
            `;
    const finalCompiledHtmlMarkup = filteredArray.length ? filteredArray.map(renderBlockFactoryHtml).join('') : `
                <div class="text-center py-8 text-slate-400 text-xs font-medium">No stored proposal matching records found.</div>
            `;
    if (desktopGenerationsScrollList)
        desktopGenerationsScrollList.innerHTML = finalCompiledHtmlMarkup;
    if (mobileGenerationsScrollList)
        mobileGenerationsScrollList.innerHTML = finalCompiledHtmlMarkup;
}
if (desktopHistorySearchBox) {
    desktopHistorySearchBox.addEventListener('input', (e) => {
        globalActiveSearchQueryToken = e.target.value;
        renderProposalsListCanvasDOM();
    });
}
if (mobileHistorySearchBox) {
    mobileHistorySearchBox.addEventListener('input', (e) => {
        globalActiveSearchQueryToken = e.target.value;
        renderProposalsListCanvasDOM();
    });
}
async function renameProposalDocRecord(docId, nextTitleValue) {
    if (!currentUserObject || !nextTitleValue.trim())
        return;
    try {
        await db.collection('users').doc(currentUserObject.uid).collection('proposals').doc(docId).update({
            title: nextTitleValue.trim()
        });
    }
    catch (err) {
        console.error("Operational update abort:", err);
    }
}
async function deleteProposalDocRecord(docId) {
    if (!currentUserObject || !confirm("Are you sure you want to delete this proposal?"))
        return;
    try {
        await db.collection('users').doc(currentUserObject.uid).collection('proposals').doc(docId).delete();
    }
    catch (err) {
        console.error("Deletion transaction execution rollback:", err);
    }
}
function loadArchivedItemToWorkspace(docId) {
    const targetingMatchNode = proposalLogsCacheArray.find(g => g.id === docId);
    if (!targetingMatchNode)
        return;
    topicInputField.value = targetingMatchNode.promptInput || "";
    updateCustomDropdownUIValueDisplay('platform', targetingMatchNode.platform || "Upwork");
    updateCustomDropdownUIValueDisplay('tone', targetingMatchNode.tone || "Professional");
    updateCustomDropdownUIValueDisplay('length', targetingMatchNode.length || "Short");
    addCtaCheckbox.checked = !!targetingMatchNode.addCTA;
    const brandInput = document.getElementById('brandContextInput');
    const sampleInput = document.getElementById('sampleWritingStyleInput');
    if (brandInput)
        brandInput.value = targetingMatchNode.brandContext || "";
    if (sampleInput)
        sampleInput.value = targetingMatchNode.sampleWritingStyle || "";
    try {
        const parsedObject = JSON.parse(targetingMatchNode.generatedOutput);
        activeGeneratedProposalObject = parsedObject;
        renderStructuredOutput(parsedObject);
    }
    catch (e) {
        const fallbackObject = {
            analysis: { complexity: "Medium", estimatedProjectSize: "Medium", clientPriorities: "No summary context provided.", missingInformation: [] },
            questions: [],
            proposal: targetingMatchNode.generatedOutput,
            subject: "",
            cta: ""
        };
        activeGeneratedProposalObject = fallbackObject;
        renderStructuredOutput(fallbackObject);
    }
    closeMobileDrawerHandler();
}
// REPAIRED: Upgraded to use fault-tolerant defensive injection to ensure zero layout crashes
function renderStructuredOutput(dataObject) {
    fallbackEmptyStatePanel.classList.add('hidden');
    contentRendererDisplayBlock.classList.remove('hidden');
    copyToClipboardBtn.classList.remove('hidden');
    outputDisplayScreenFrame.classList.remove('justify-center');
    const analysisObj = dataObject.analysis || {};
    const safeSetHtml = (id, targetContent) => {
        const elementNode = document.getElementById(id);
        if (elementNode) {
            elementNode.innerHTML = formatTextTokenWeights(targetContent);
        }
    };
    safeSetHtml('generatedComplexity', analysisObj.complexity || "Medium");
    safeSetHtml('generatedDuration', analysisObj.estimatedProjectSize || "Medium");
    const missingInfoArray = analysisObj.missingInformation || [];
    const missingInfoHtml = missingInfoArray.length > 0 ? missingInfoArray.map(item => `• ${item}`).join('<br>') : "None listed";
    safeSetHtml('generatedMissingInfo', missingInfoHtml);
    safeSetHtml('generatedClientPriorities', analysisObj.clientPriorities || "No explicit priorities listed.");
    const clientFitEl = document.getElementById('generatedClientFit');
    if (clientFitEl) {
        clientFitEl.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> Excellent Match`;
    }
    const questionsArray = dataObject.questions || [];
    const questionsContainer = document.getElementById('questionsContainerBlock');
    const validQuestions = questionsArray.filter(q => q && q.trim() !== "");
    if (validQuestions.length === 0) {
        if (questionsContainer)
            questionsContainer.classList.add('hidden');
    }
    else {
        if (questionsContainer) {
            questionsContainer.classList.remove('hidden');
            const questionsHtml = validQuestions.map(q => `• ${q}`).join('<br>');
            safeSetHtml('generatedQuestions', questionsHtml);
        }
    }
    safeSetHtml('generatedProposalText', dataObject.proposal || "None generated.");
    const subjectText = dataObject.subject || "";
    const subjectBlock = document.getElementById('subjectDisplayBlock');
    if (subjectBlock) {
        if (!subjectText.trim()) {
            subjectBlock.classList.add('hidden');
        }
        else {
            subjectBlock.classList.remove('hidden');
            safeSetHtml('generatedSubjectText', subjectText);
        }
    }
    const ctaText = dataObject.cta || "";
    const ctaBlock = document.getElementById('ctaDisplayBlock');
    if (ctaBlock) {
        if (!ctaText.trim()) {
            ctaBlock.classList.add('hidden');
        }
        else {
            ctaBlock.classList.remove('hidden');
            safeSetHtml('generatedCtaText', ctaText);
        }
    }
}
function formatTextTokenWeights(rawStr) {
    if (!rawStr)
        return "";
    return rawStr.toString()
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}
function setUIProcessingState(isLoading) {
    generationTriggerBtn.disabled = isLoading;
    generationTriggerBtn.style.opacity = isLoading ? "0.6" : "1";
    statusDotIndicator.className = isLoading ? "w-2 h-2 rounded-full bg-amber-400 animate-bounce" : "w-2 h-2 rounded-full bg-emerald-500";
    statusLabelIndicator.innerText = isLoading ? "Generating..." : "Ready";
}
generationTriggerBtn.addEventListener('click', async () => {
    const promptValueInputString = topicInputField.value.trim();
    if (!promptValueInputString) {
        alert("Please write your core project description parameters first.");
        return;
    }
    setUIProcessingState(true);
    const platformToken = activeFormStateModel.platform;
    const toneToken = activeFormStateModel.tone;
    const lengthToken = activeFormStateModel.length;
    const ctaActiveFlag = addCtaCheckbox.checked;
    const brandContextToken = document.getElementById('brandContextInput') ? document.getElementById('brandContextInput').value.trim() : "";
    const sampleStyleToken = document.getElementById('sampleWritingStyleInput') ? document.getElementById('sampleWritingStyleInput').value.trim() : "";
    try {
        const apiPayloadResponse = await fetch('/api/proposal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: promptValueInputString,
                platform: platformToken,
                tone: toneToken,
                length: lengthToken,
                addCTA: ctaActiveFlag,
                brandContext: brandContextToken,
                sampleWritingStyle: sampleStyleToken
            })
        });
        if (!apiPayloadResponse.ok)
            throw new Error(`HTTP System Exception Status: ${apiPayloadResponse.status}`);
        const structuredDataPayload = await apiPayloadResponse.json();
        activeGeneratedProposalObject = structuredDataPayload;
        renderStructuredOutput(structuredDataPayload);
        setUIProcessingState(false);
        statusLabelIndicator.innerText = "Generation complete.";
        if (currentUserObject) {
            const formattedTruncatedTitle = promptValueInputString.split('\n')[0].substring(0, 22) + "...";
            await db.collection('users').doc(currentUserObject.uid).collection('proposals').add({
                title: formattedTruncatedTitle,
                promptInput: promptValueInputString,
                platform: platformToken,
                tone: toneToken,
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
        console.error("Upstream connection fault:", err);
        statusDotIndicator.className = "w-2 h-2 rounded-full bg-red-500";
        statusLabelIndicator.innerText = "Fatal connection abort error.";
        setUIProcessingState(false);
        alert("Failed to connect successfully with text generation channels.");
    }
});
async function handleMicroRefinement(actionKey) {
    if (!activeGeneratedProposalObject) {
        alert("Generate a layout first before processing modifications.");
        return;
    }
    setUIProcessingState(true);
    try {
        const apiPayloadResponse = await fetch('/api/proposal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform: activeFormStateModel.platform,
                tone: activeFormStateModel.tone,
                length: activeFormStateModel.length,
                addCTA: addCtaCheckbox.checked,
                refineAction: actionKey,
                existingProposalContext: JSON.stringify(activeGeneratedProposalObject)
            })
        });
        if (!apiPayloadResponse.ok)
            throw new Error();
        const refinedData = await apiPayloadResponse.json();
        activeGeneratedProposalObject = refinedData;
        renderStructuredOutput(refinedData);
        setUIProcessingState(false);
        statusLabelIndicator.innerText = "Refinement update compiled.";
    }
    catch (err) {
        console.error("Micro-refinement anomaly:", err);
        setUIProcessingState(false);
        statusLabelIndicator.innerText = "Failed to apply variant configuration modification.";
    }
}
// Preserve the inline action callbacks used by the existing output controls.
window.copyIndividualSegmentBlock = copyIndividualSegmentBlock;
window.handleMicroRefinement = handleMicroRefinement;

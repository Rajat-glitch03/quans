// @ts-nocheck
/* Existing tool-generation and Firebase history logic migrated to TypeScript. API payloads and endpoint contracts are preserved. */
// --- INITIALIZE REAL-TIME CONFIG ---
        const firebaseConfig = {
              apiKey: "AIzaSyAlixKQr90Wn2u1kOkE7erppf7omed5KXU",
              authDomain: "quans-175a2.firebaseapp.com",
              projectId: "quans-175a2",
              storageBucket: "quans-175a2.firebasestorage.app",
              messagingSenderId: "221298439204",
              appId: "1:221298439204:web:47b39c005411c979ca54b1",
              measurementId: "G-J6EZ37W65Y"
        };
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        const auth = firebase.auth();
        const db = firebase.firestore();

        // DOM Elements
        const sidebar = document.getElementById('sidebar');
        const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        const closeSidebarMobile = document.getElementById('closeSidebarMobile');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const sendBtnIcon = document.getElementById('sendBtnIcon');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const messagesArea = document.getElementById('messagesArea');
        const chatBox = document.getElementById('chatBox');
        const inputWrapper = document.getElementById('inputWrapper');
        
        const newChatBtn = document.getElementById('newChatBtn');
        const historyList = document.getElementById('historyList');
        const historySearch = document.getElementById('historySearch');
        const clearSearchBtn = document.getElementById('clearSearchBtn');

        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');
        const userGreeting = document.getElementById('userGreeting');

        // Global Application Context States
        let currentUser = null;
        let activeChatId = null;
        let localChatsCache = [];
        let currentChatMessages = []; 
        let isFirstMessage = true;
        let isSidebarOpen = true;

        // Streaming Cancellation Interruption Token Control Flag
        let isGenerationActive = false;
        let shouldAbortCurrentStream = false;

        // --- CLEAN AUTH GUARD STATE ENGINE ---
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                userGreeting.innerText = `Hello!`;
                subscribeToChatHistory();
            } else {
                window.location.href = 'index.html';
            }
        });

        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('opacity-0');
            userDropdown.classList.toggle('pointer-events-none');
            userDropdown.classList.toggle('translate-y-2');
        });

        document.addEventListener('click', () => {
            userDropdown.classList.add('opacity-0');
            userDropdown.classList.add('pointer-events-none');
            userDropdown.classList.add('translate-y-2');
        });

        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                window.location.href = 'index.html';
            } catch (err) {
                console.error(err);
            }
        });

        function toggleSidebar() {
            if (window.innerWidth < 640) {
                if (sidebar.classList.contains('-translate-x-full')) {
                    sidebar.classList.remove('-translate-x-full');
                    sidebar.classList.add('translate-x-0');
                    mobileOverlay.classList.remove('hidden');
                } else {
                    sidebar.classList.remove('translate-x-0');
                    sidebar.classList.add('-translate-x-full');
                    mobileOverlay.classList.add('hidden');
                }
            } else {
                if(isSidebarOpen) {
                    sidebar.style.transform = 'translateX(-100%)';
                    sidebar.style.marginRight = `-${sidebar.offsetWidth}px`;
                } else {
                    sidebar.style.transform = 'translateX(0)';
                    sidebar.style.marginRight = '0px';
                }
                isSidebarOpen = !isSidebarOpen;
            }
        }

        if (window.innerWidth < 640) {
            sidebar.classList.add('-translate-x-full');
            isSidebarOpen = false;
        }

        toggleSidebarBtn.addEventListener('click', toggleSidebar);
        closeSidebarMobile.addEventListener('click', toggleSidebar);
        mobileOverlay.addEventListener('click', toggleSidebar);

        // Auto-Expanding Height Matrix Engine logic for elastic Textarea control
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        function subscribeToChatHistory() {
            if (!currentUser) return;
            
            db.collection('users').doc(currentUser.uid).collection('chats')
              .orderBy('updatedAt', 'desc')
              .onSnapshot((snapshot) => {
                  localChatsCache = [];
                  snapshot.forEach(doc => { localChatsCache.push({ id: doc.id, ...doc.data() }); });
                  renderHistoryItems(localChatsCache);
              }, err => { console.error(err); });
        }

        function renderHistoryItems(chats) {
            historyList.innerHTML = '';
            if(chats.length === 0) {
                historyList.innerHTML = `<p class="text-xs text-slate-400 italic pl-2 py-2">No conversations found</p>`;
                return;
            }

            chats.forEach(chat => {
                const isActive = chat.id === activeChatId;
                const historyItem = document.createElement('div');
                historyItem.className = `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 ${
                    isActive ? 'bg-slate-200/70 text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900'
                } cursor-pointer`;
                
                historyItem.setAttribute('onclick', `loadConversation('${chat.id}')`);

                historyItem.innerHTML = `
                    <div class="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                        <i class="fa-regular fa-message text-xs shrink-0 ${isActive ? 'text-brand-blue' : 'text-slate-400 group-hover:text-slate-600'}"></i>
                        <span id="title_text_${chat.id}" class="text-sm truncate font-medium">${chat.title || 'Untitled Chat'}</span>
                        <input id="title_input_${chat.id}" type="text" class="hidden text-sm bg-white border border-brand-blue px-1.5 py-0.5 rounded outline-none w-full font-medium text-slate-800" value="${chat.title || ''}" onclick="event.stopPropagation()">
                    </div>
                    <div class="flex items-center space-x-1 shrink-0">
                        <button onclick="event.stopPropagation(); triggerRenameInline('${chat.id}')" class="text-slate-400 hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <i class="fa-solid fa-pencil text-[11px]"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteConversation('${chat.id}')" class="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <i class="fa-solid fa-trash-can text-[11px]"></i>
                        </button>
                    </div>
                `;
                historyList.appendChild(historyItem);
            });
        }

        historySearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length > 0) {
                clearSearchBtn.classList.remove('hidden');
                const filtered = localChatsCache.filter(chat => (chat.title && chat.title.toLowerCase().includes(query)));
                renderHistoryItems(filtered);
            } else {
                clearSearchBtn.classList.add('hidden');
                renderHistoryItems(localChatsCache);
            }
        });

        clearSearchBtn.addEventListener('click', () => {
            historySearch.value = '';
            clearSearchBtn.classList.add('hidden');
            renderHistoryItems(localChatsCache);
        });

        window.triggerRenameInline = function(chatId) {
            const labelSpan = document.getElementById(`title_text_${chatId}`);
            const editInput = document.getElementById(`title_input_${chatId}`);
            if(!labelSpan || !editInput) return;

            labelSpan.classList.add('hidden');
            editInput.classList.remove('hidden');
            editInput.focus(); editInput.select();

            const saveBlock = async () => {
                const nextTitle = editInput.value.trim();
                if(nextTitle && nextTitle !== labelSpan.innerText) {
                    labelSpan.innerText = nextTitle;
                    await db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).update({ title: nextTitle });
                }
                labelSpan.classList.remove('hidden'); editInput.classList.add('hidden');
            };

            editInput.onkeydown = (ev) => {
                if(ev.key === 'Enter') { ev.preventDefault(); saveBlock(); }
                if(ev.key === 'Escape') {
                    editInput.value = labelSpan.innerText;
                    labelSpan.classList.remove('hidden'); editInput.classList.add('hidden');
                }
            };
            editInput.onblur = saveBlock;
        };

        window.deleteConversation = async function(chatId) {
            if(!currentUser) return;
            try {
                await db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).delete();
                if(activeChatId === chatId) { resetWorkspaceUI(); }
            } catch(e) { console.error(e); }
        };

        window.loadConversation = async function(chatId) {
            if(!currentUser) return;
            activeChatId = chatId;
            renderHistoryItems(localChatsCache);

            try {
                const snapshot = await db.collection('users').doc(currentUser.uid).collection('chats').doc(chatId).get();
                if(!snapshot.exists) return;

                const data = snapshot.data();
                messagesArea.innerHTML = '';
                
                const rawMessages = data.messages || [];
                currentChatMessages = rawMessages.map(msg => {
                    if (msg.parts && Array.isArray(msg.parts)) return msg;
                    return {
                        role: msg.role === 'model' ? 'model' : 'user',
                        parts: [{ text: msg.text || "" }]
                    };
                });
                
                if (currentChatMessages.length > 0) {
                    welcomeScreen.classList.add('hidden');
                    welcomeScreen.style.opacity = '0';
                    document.getElementById('resumePromptGrid')?.classList.add('hidden');
                    messagesArea.classList.remove('hidden');
                    isFirstMessage = false;

                    currentChatMessages.forEach(msg => {
                        let renderText = "";
                        if(Array.isArray(msg.parts)) {
                            const textPart = msg.parts.find(p => p.text);
                            renderText = textPart ? textPart.text : "[Media Attachment]";
                        } else {
                            renderText = msg.text || "";
                        }
                        appendCustomStaticMessageBubble(renderText, msg.role === 'user');
                    });
                } else {
                    resetWorkspaceUIKeepId(chatId);
                }
                setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 50);
                if(window.innerWidth < 640) toggleSidebar();
            } catch (err) { console.error(err); }
        };

        // Static append wrapper with custom feedback tracking capability bindings
        function appendCustomStaticMessageBubble(htmlContent, isUser) {
            const wrapper = document.createElement('div');
            wrapper.className = `flex w-full fade-in flex-col ${isUser ? 'items-end' : 'items-start'}`;
            
            const row = document.createElement('div');
            row.className = `flex w-full ${isUser ? 'justify-end' : 'justify-start'}`;

            const bubble = document.createElement('div');
            bubble.className = `max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                isUser ? 'bg-brand-blue text-white rounded-3xl rounded-br-sm' : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-3xl rounded-bl-sm'
            }`;
            
            bubble.innerHTML = htmlContent;
            row.appendChild(bubble);
            wrapper.appendChild(row);

            // Append Utility Feedback Toolbar Node for completed Model responses seamlessly
            if (!isUser && !htmlContent.includes("Thinking...") && !htmlContent.includes("stopped by user") && !htmlContent.includes("Error fetching response")) {
                const actionToolbar = document.createElement('div');
                actionToolbar.className = 'flex items-center gap-3 mt-1.5 ml-3 text-slate-400 text-xs';
                
                // Pure clean text rendering parser computation for local clipboard integration
                const cleanExtractText = bubble.innerText || bubble.textContent;

                actionToolbar.innerHTML = `
                    <button class="hover:text-emerald-500 transition-colors p-1" onclick="handleFeedbackClick(this, 'like')">
                        <i class="fa-regular fa-thumbs-up"></i>
                    </button>
                    <button class="hover:text-rose-500 transition-colors p-1" onclick="handleFeedbackClick(this, 'dislike')">
                        <i class="fa-regular fa-thumbs-down"></i>
                    </button>
                    <button class="hover:text-brand-blue transition-colors p-1 flex items-center gap-1" onclick="handleCopyClick(this, \`${cleanExtractText.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                        <i class="fa-regular fa-copy"></i>
                        <span class="text-[10px] hidden font-medium">Copied!</span>
                    </button>
                `;
                wrapper.appendChild(actionToolbar);
            }

            messagesArea.appendChild(wrapper);
        }

        // Action Feedback Element Handler Utility Controls
        window.handleFeedbackClick = function(btnElement, feedbackType) {
            const parent = btnElement.parentElement;
            const buttons = parent.querySelectorAll('button');
            
            if (feedbackType === 'like') {
                const icon = btnElement.querySelector('i');
                if (icon.classList.contains('fa-regular')) {
                    icon.className = 'fa-solid fa-thumbs-up text-emerald-600';
                    const dislikeIcon = buttons[1].querySelector('i');
                    dislikeIcon.className = 'fa-regular fa-thumbs-down';
                } else {
                    icon.className = 'fa-regular fa-thumbs-up';
                }
            } else if (feedbackType === 'dislike') {
                const icon = btnElement.querySelector('i');
                if (icon.classList.contains('fa-regular')) {
                    icon.className = 'fa-solid fa-thumbs-down text-rose-600';
                    const likeIcon = buttons[0].querySelector('i');
                    likeIcon.className = 'fa-regular fa-thumbs-up';
                } else {
                    icon.className = 'fa-regular fa-thumbs-down';
                }
            }
        };

        window.handleCopyClick = function(btnElement, textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                const statusSpan = btnElement.querySelector('span');
                const copyIcon = btnElement.querySelector('i');
                
                if (statusSpan) {
                    statusSpan.classList.remove('hidden');
                    copyIcon.className = 'fa-solid fa-check text-brand-blue';
                    setTimeout(() => {
                        statusSpan.classList.add('hidden');
                        copyIcon.className = 'fa-regular fa-copy';
                    }, 2000);
                }
            }).catch(err => { console.error('Clipboard fault:', err); });
        };

        function resetWorkspaceUI() {
            activeChatId = null;
            isFirstMessage = true;
            document.getElementById('resumePromptGrid')?.classList.remove('hidden');
            currentChatMessages = [];
            messagesArea.innerHTML = '';
            messagesArea.classList.add('hidden');
            welcomeScreen.classList.remove('hidden');
            welcomeScreen.style.opacity = '1';
            renderHistoryItems(localChatsCache);
        }

        function resetWorkspaceUIKeepId(chatId) {
            activeChatId = chatId;
            isFirstMessage = true;
            document.getElementById('resumePromptGrid')?.classList.remove('hidden');
            currentChatMessages = [];
            messagesArea.innerHTML = '';
            messagesArea.classList.add('hidden');
            welcomeScreen.classList.remove('hidden');
            welcomeScreen.style.opacity = '1';
        }

        newChatBtn.addEventListener('click', () => { resetWorkspaceUI(); });

        function streamAIResponseText(rawHtmlText, bubbleTargetElement) {
            bubbleTargetElement.innerHTML = ''; 
            let i = 0;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHtmlText;
            const flatTokens = [];
            
            function segmentNode(node) {
                if(node.nodeType === Node.TEXT_NODE) {
                    node.nodeValue.split('').forEach(c => flatTokens.push({ type: 'text', value: c }));
                } else if(node.nodeType === Node.ELEMENT_NODE) {
                    if(node.tagName === 'BR') {
                        flatTokens.push({ type: 'br' });
                    } else {
                        flatTokens.push({ type: 'tag-start', tag: node.tagName.toLowerCase(), attrs: Array.from(node.attributes) });
                        Array.from(node.childNodes).forEach(segmentNode);
                        flatTokens.push({ type: 'tag-end' });
                    }
                }
            }
            Array.from(tempDiv.childNodes).forEach(segmentNode);

            let activeContainer = bubbleTargetElement;
            const elementStack = [];

            async function renderNextToken() {
                // If cancellation request intercepts loop cycle, interrupt execution immediately
                if (shouldAbortCurrentStream) {
                    finalizeGenerationControlUI();
                    return;
                }

                if(i >= flatTokens.length) {
                    currentChatMessages.push({ role: 'model', parts: [{ text: rawHtmlText }] });
                    if(currentUser && activeChatId) {
                        await db.collection('users').doc(currentUser.uid).collection('chats').doc(activeChatId).update({
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            messages: currentChatMessages
                        });
                    }
                    
                    // Injection of active feedback action items dynamically on successful loop completion
                    finalizeGenerationControlUI();
                    
                    // Render action panel below model container wrapper node elements row
                    const wrapperNode = bubbleTargetElement.closest('.flex-col');
                    if (wrapperNode) {
                        const cleanExtractText = bubbleTargetElement.innerText || bubbleTargetElement.textContent;
                        const actionToolbar = document.createElement('div');
                        actionToolbar.className = 'flex items-center gap-3 mt-1.5 ml-3 text-slate-400 text-xs';
                        actionToolbar.innerHTML = `
                            <button class="hover:text-emerald-500 transition-colors p-1" onclick="handleFeedbackClick(this, 'like')">
                                <i class="fa-regular fa-thumbs-up"></i>
                            </button>
                            <button class="hover:text-rose-500 transition-colors p-1" onclick="handleFeedbackClick(this, 'dislike')">
                                <i class="fa-regular fa-thumbs-down"></i>
                            </button>
                            <button class="hover:text-brand-blue transition-colors p-1 flex items-center gap-1" onclick="handleCopyClick(this, \`${cleanExtractText.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                                <i class="fa-regular fa-copy"></i>
                                <span class="text-[10px] hidden font-medium">Copied!</span>
                            </button>
                        `;
                        wrapperNode.appendChild(actionToolbar);
                    }
                    return;
                }

                const token = flatTokens[i];
                if(token.type === 'text') {
                    activeContainer.appendChild(document.createTextNode(token.value));
                } else if(token.type === 'br') {
                    activeContainer.appendChild(document.createElement('br'));
                } else if(token.type === 'tag-start') {
                    const el = document.createElement(token.tag);
                    token.attrs.forEach(attr => el.setAttribute(attr.name, attr.value));
                    activeContainer.appendChild(el);
                    elementStack.push(activeContainer);
                    activeContainer = el;
                } else if(token.type === 'tag-end') {
                    if(elementStack.length > 0) activeContainer = elementStack.pop();
                }

                i++;
                chatBox.scrollTop = chatBox.scrollHeight;
                setTimeout(renderNextToken, 8);
            }
            renderNextToken();
        }

        // Toggle dispatch control wrapper setup layer resets 
        function setGenerationUIVisualState(activeState) {
            isGenerationActive = activeState;
            if (activeState) {
                sendBtn.classList.remove('bg-brand-blue', 'hover:bg-brand-hover');
                sendBtn.classList.add('bg-red-500', 'hover:bg-red-600');
                sendBtnIcon.className = 'fa-solid fa-square text-xs'; // Transition send arrow to square stop icon
            } else {
                sendBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                sendBtn.classList.add('bg-brand-blue', 'hover:bg-brand-hover');
                sendBtnIcon.className = 'fa-solid fa-arrow-up text-sm';
            }
        }

        function finalizeGenerationControlUI() {
            setGenerationUIVisualState(false);
            shouldAbortCurrentStream = false;
        }

        async function handleSend() {
            // Handle active execution loop interrupt requests safely
            if (isGenerationActive) {
                shouldAbortCurrentStream = true;
                return;
            }

            let typedText = messageInput.value.trim();
            if (!typedText) return;

            if (isFirstMessage) {
                welcomeScreen.style.opacity = '0';
                document.getElementById('resumePromptGrid')?.classList.add('hidden');
                setTimeout(() => { 
                    welcomeScreen.classList.add('hidden'); 
                    messagesArea.classList.remove('hidden');
                }, 300);
                isFirstMessage = false;
            }

            let userBubbleHTML = `<div>${typedText}</div>`;
            appendCustomStaticMessageBubble(userBubbleHTML, true);
            // Keep the visible and Firestore history clean; inject career context only into the API request copy.
            currentChatMessages.push({ role: 'user', parts: [{ text: typedText }] });
            
            // Clear input metrics and revert elastic row height properties back to baseline state
            messageInput.value = '';
            messageInput.style.height = 'auto';
            
            setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 30);

            let deducedTitle = typedText.length > 24 ? typedText.substring(0, 23) + "..." : typedText;
            if (!activeChatId && currentUser) {
                const freshDocRef = db.collection('users').doc(currentUser.uid).collection('chats').doc();
                activeChatId = freshDocRef.id;
                await freshDocRef.set({
                    title: deducedTitle,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    messages: currentChatMessages
                });
            } else if (currentUser && activeChatId) {
                await db.collection('users').doc(currentUser.uid).collection('chats').doc(activeChatId).update({
                    messages: currentChatMessages,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            const aiWrapper = document.createElement('div');
            aiWrapper.className = `flex w-full fade-in flex-col items-start`;
            
            const aiRow = document.createElement('div');
            aiRow.className = `flex w-full justify-start`;

            const aiBubble = document.createElement('div');
            aiBubble.className = `max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm bg-slate-50 border border-slate-100 text-slate-800 rounded-3xl rounded-bl-sm`;
            aiBubble.innerText = "Thinking...";
            
            aiRow.appendChild(aiBubble);
            aiWrapper.appendChild(aiRow);
            messagesArea.appendChild(aiWrapper);
            chatBox.scrollTop = chatBox.scrollHeight;

            // Trigger generation sequence locks
            setGenerationUIVisualState(true);

            try {
                // Return immediate break checkpoint verification check
                if (shouldAbortCurrentStream) {
                    throw new DOMException("Aborted", "AbortError");
                }

                const resumeToolkitContext = `You are Quans Resume Builder & Career Toolkit, a practical career-writing specialist. Help the user create clear, truthful, ATS-friendly resumes, tailor experience to job descriptions without inventing qualifications, write cover letters, prepare for interviews, and improve LinkedIn profiles. Ask for missing details when needed. Never fabricate employers, dates, credentials, metrics, or skills. Use clean headings and copy-ready formatting. When a user asks for a resume, gather relevant details and organize the result into professional sections.`;
                const requestContents = currentChatMessages.map((message, index) => {
                    if (index !== 0 || message.role !== 'user' || !Array.isArray(message.parts)) return message;
                    const firstTextIndex = message.parts.findIndex((part) => typeof part.text === 'string');
                    if (firstTextIndex < 0) return message;
                    return {
                        ...message,
                        parts: message.parts.map((part, partIndex) => partIndex === firstTextIndex
                            ? { ...part, text: `${resumeToolkitContext}\n\nUser request: ${part.text}` }
                            : part)
                    };
                });
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: requestContents })
                });

                if (shouldAbortCurrentStream) {
                    throw new DOMException("Aborted", "AbortError");
                }

                if (!response.ok) throw new Error(`API Error: ${response.status}`);

                const data = await response.json();
                const aiResponseText = data.candidates[0].content.parts[0].text;
                
                const processedHtml = aiResponseText
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n/g, '<br>');

                if (shouldAbortCurrentStream) {
                    throw new DOMException("Aborted", "AbortError");
                }

                streamAIResponseText(processedHtml, aiBubble);

            } catch (error) {
                console.error(error);
                finalizeGenerationControlUI();

                if (error.name === 'AbortError' || shouldAbortCurrentStream) {
                    const cancellationMarkup = `<span class="text-rose-500 font-medium"><i class="fa-solid fa-circle-stop mr-1.5"></i>response stopped by user</span>`;
                    aiBubble.innerHTML = cancellationMarkup;
                    aiBubble.className = `max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm border border-rose-100 bg-rose-50 rounded-3xl rounded-bl-sm`;
                    
                    currentChatMessages.push({ role: 'model', parts: [{ text: "response stopped by user" }] });
                } else {
                    const errorMarkup = `<span class="text-red-500 font-medium">Error fetching response. Verify server links.</span>`;
                    aiBubble.innerHTML = errorMarkup;
                    aiBubble.classList.add('border-red-200', 'bg-red-50');
                    currentChatMessages.push({ role: 'model', parts: [{ text: errorMarkup }] });
                }

                if(currentUser && activeChatId) {
                    await db.collection('users').doc(currentUser.uid).collection('chats').doc(activeChatId).update({
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        messages: currentChatMessages
                    });
                }
            }
        }

        sendBtn.addEventListener('click', handleSend);
        
        // Prevent multi-row newline processing breaking keydown submit actions on Desktop layouts
        messageInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSend(); 
            } 
        });

        // --- PASSWORD VISIBILITY TOGGLE ENGINE ---
        const togglePasswordBtn = document.getElementById('togglePasswordBtn');
        const loginPasswordInput = document.getElementById('loginPasswordInput');
        const eyeIcon = document.getElementById('eyeIcon');

        if (togglePasswordBtn && loginPasswordInput) {
            togglePasswordBtn.addEventListener('click', () => {
                const isPassword = loginPasswordInput.type === 'password';
                loginPasswordInput.type = isPassword ? 'text' : 'password';
                if(eyeIcon) {
                    eyeIcon.classList.toggle('fa-eye', !isPassword);
                    eyeIcon.classList.toggle('fa-eye-slash', isPassword);
                }
            });
        }

        if (window.visualViewport) {
            const adjustMobileLayout = () => {
                if (window.innerWidth < 640) {
                    const keyboardOffset = window.innerHeight - window.visualViewport.height;
                    inputWrapper.style.bottom = keyboardOffset > 0 ? `${keyboardOffset}px` : '0px';
                    chatBox.scrollTop = chatBox.scrollHeight;
                } else {
                    inputWrapper.style.bottom = '0px';
                }
            };
            window.visualViewport.addEventListener('resize', adjustMobileLayout);
            messageInput.addEventListener('focus', () => { setTimeout(adjustMobileLayout, 50); });
        }
    

// Career prompt starters feed the existing authenticated /api/chat workflow.
document.querySelectorAll('[data-resume-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
        const prompt = button.getAttribute('data-resume-prompt') || '';
        if (prompt && messageInput) {
            messageInput.value = prompt;
            messageInput.focus();
        }
    });
});

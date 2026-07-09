/**
 * modules/chat.js
 * Handles real-time messaging between users.
 */

import { db, auth, collection, addDoc, query, where, orderBy, onSnapshot, getDocs, doc, setDoc, getDoc, serverTimestamp } from '../../firebase-config.js';

export class ChatSystem {
    constructor(container) {
        this.container = container;
        this.activeRoomId = null;
        this.unsubscribeMessages = null;
        this.unsubscribeRooms = null;
    }

    init() {
        if (!auth.currentUser) {
            this.renderLoginPrompt();
            return;
        }
        this.renderLayout();
        this.listenToRooms();
    }

    renderLoginPrompt() {
        this.container.innerHTML = `
            <div class="glass-panel p-8 text-center">
                <h2 class="text-xl mb-4">Please log in to chat</h2>
                <p class="text-gray-400">Secure messaging is only available to registered users.</p>
            </div>
        `;
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="chat-interface glass-panel h-[80vh] flex overflow-hidden rounded-xl border border-gray-700">
                <!-- Sidebar -->
                <div class="w-1/3 border-r border-gray-700 flex flex-col bg-gray-900/50">
                    <div class="p-4 border-b border-gray-700">
                        <h2 class="font-bold text-white">Messages</h2>
                    </div>
                    <div id="chat-rooms-list" class="flex-1 overflow-y-auto p-2 space-y-2">
                        <div class="loading-spinner w-6 h-6 mx-auto mt-4"></div>
                    </div>
                </div>
                
                <!-- Chat Area -->
                <div class="w-2/3 flex flex-col bg-gray-900/30 relative">
                    <!-- Header -->
                    <div id="chat-header" class="p-4 border-b border-gray-700 flex justify-between items-center hidden">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold" id="chat-header-avatar">?</div>
                            <div>
                                <h3 class="font-bold text-white" id="chat-header-name">User</h3>
                                <p class="text-xs text-gray-400" id="chat-header-item">Item Info</p>
                            </div>
                        </div>
                    </div>

                    <!-- Messages -->
                    <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
                        <div class="h-full flex items-center justify-center text-gray-500 flex-col">
                            <div class="text-4xl mb-4">💬</div>
                            <p>Select a conversation to start chatting</p>
                        </div>
                    </div>

                    <!-- Input -->
                    <div id="chat-input-area" class="p-4 border-t border-gray-700 bg-gray-900/80 hidden">
                        <form id="message-form" class="flex gap-2">
                            <input type="text" id="message-input" class="flex-1 bg-gray-800 border-none rounded-full px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="Type a message..." autocomplete="off">
                            <button type="submit" class="bg-cyan-500 text-black rounded-full w-12 h-12 flex items-center justify-center hover:bg-cyan-400 transition-colors">
                                ➤
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('message-form').addEventListener('submit', (e) => this.sendMessage(e));
    }

    listenToRooms() {
        if (this.unsubscribeRooms) this.unsubscribeRooms();

        const q = query(
            collection(db, 'rooms'),
            where('participants', 'array-contains', auth.currentUser.uid),
            orderBy('lastUpdated', 'desc')
        );

        this.unsubscribeRooms = onSnapshot(q, (snapshot) => {
            const listContainer = document.getElementById('chat-rooms-list');
            if (snapshot.empty) {
                listContainer.innerHTML = '<div class="text-center text-gray-500 mt-4 text-sm">No conversations yet</div>';
                return;
            }

            listContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const room = doc.data();
                const otherUserId = room.participants.find(id => id !== auth.currentUser.uid);
                // In a real app we'd fetch the other user's name/avatar. For MVP we use stored data if available or generic.
                const displayName = room.participantNames ? room.participantNames[otherUserId] : 'User';

                const el = document.createElement('div');
                el.className = `p-3 rounded-lg cursor-pointer transition-colors hover:bg-white/5 ${this.activeRoomId === doc.id ? 'bg-white/10 border-l-2 border-cyan-400' : ''}`;
                el.innerHTML = `
                    <div class="flex justify-between mb-1">
                        <span class="font-bold text-white text-sm">${displayName}</span>
                        <span class="text-xs text-gray-500">${this.formatTime(room.lastUpdated)}</span>
                    </div>
                    <div class="text-xs text-gray-400 truncate">${room.lastMessage || 'Started a chat'}</div>
                    <div class="text-xs text-cyan-600 mt-1 truncate">Topic: ${room.listingTitle || 'General'}</div>
                `;
                el.onclick = () => this.openRoom(doc.id, room);
                listContainer.appendChild(el);
            });
        });
    }

    async openRoom(roomId, roomData) {
        this.activeRoomId = roomId;
        this.listenToRooms(); // Re-render list to highlight active

        // Update Header
        const otherUserId = roomData.participants.find(id => id !== auth.currentUser.uid);
        const displayName = roomData.participantNames ? roomData.participantNames[otherUserId] : 'User';

        document.getElementById('chat-header').classList.remove('hidden');
        document.getElementById('chat-input-area').classList.remove('hidden');
        document.getElementById('chat-header-name').textContent = displayName;
        document.getElementById('chat-header-avatar').textContent = displayName[0].toUpperCase();
        document.getElementById('chat-header-item').textContent = roomData.listingTitle || 'Item Inquiry';

        // Listen Messages
        if (this.unsubscribeMessages) this.unsubscribeMessages();

        const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('timestamp', 'asc'));
        this.unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const msgContainer = document.getElementById('chat-messages');
            msgContainer.innerHTML = ''; // Full redraw for simplicity in MVP

            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMe = msg.senderId === auth.currentUser.uid;

                const bubble = document.createElement('div');
                bubble.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`;
                bubble.innerHTML = `
                    <div class="max-w-[70%] px-4 py-2 rounded-2xl ${isMe ? 'bg-cyan-500/20 text-cyan-100 rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}">
                        <p class="text-sm">${msg.text}</p>
                        <span class="text-[10px] opacity-50 block text-right mt-1">${this.formatTime(msg.timestamp)}</span>
                    </div>
                `;
                msgContainer.appendChild(bubble);
            });

            // Scroll to bottom
            msgContainer.scrollTop = msgContainer.scrollHeight;
        });
    }

    async sendMessage(e) {
        e.preventDefault();
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        if (!text || !this.activeRoomId) return;

        input.value = '';

        // Add Message
        await addDoc(collection(db, 'rooms', this.activeRoomId, 'messages'), {
            text: text,
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp()
        });

        // Update Room Last Message
        await setDoc(doc(db, 'rooms', this.activeRoomId), {
            lastMessage: text,
            lastUpdated: serverTimestamp()
        }, { merge: true });
    }

    // --- Utility to start chat from Listing ---
    static async startChat(listingId, sellerId, listingTitle) {
        if (!auth.currentUser) {
            alert('Login required to chat');
            return null;
        }

        // Check if room exists
        // (Simplified: we generate ID based on sorted UIDs to ensure uniqueness)
        const participants = [auth.currentUser.uid, sellerId].sort();
        const roomId = `${participants[0]}_${participants[1]}_${listingId}`; // Unique per item and pair

        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            // Create Room
            await setDoc(roomRef, {
                participants: participants,
                participantNames: {
                    [auth.currentUser.uid]: auth.currentUser.displayName || 'Me',
                    [sellerId]: 'Seller' // We should fetch this, but for MVP...
                },
                listingId: listingId,
                listingTitle: listingTitle,
                lastUpdated: serverTimestamp(),
                createdAt: serverTimestamp()
            });
        }

        return roomId;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

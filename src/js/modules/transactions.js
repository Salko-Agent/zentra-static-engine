/**
 * modules/transactions.js
 * Handles purchase flow and transaction records (Escrow Logic).
 */

import { db, auth, collection, addDoc, doc, updateDoc, serverTimestamp, getDoc } from '../../firebase-config.js';

export class TransactionSystem {
    constructor() {
        this.stripeKey = 'pk_test_TYooMQauvdEDq54NiTphI7jx'; // Mock/Test key (public)
    }

    async initiatePurchase(listing) {
        if (!auth.currentUser) {
            alert('Please login to purchase items.');
            return;
        }

        if (listing.sellerId === auth.currentUser.uid) {
            alert('You cannot buy your own item.');
            return;
        }

        // 1. Show Payment Modal (Simulation)
        const confirmed = await this.showPaymentModal(listing);
        if (!confirmed) return;

        try {
            // 2. Create Transaction Record (Escrow Start)
            const transactionData = {
                listingId: listing.id,
                listingTitle: listing.title,
                listingImage: listing.images ? listing.images[0] : null,
                buyerId: auth.currentUser.uid,
                buyerName: auth.currentUser.displayName || 'Buyer',
                sellerId: listing.sellerId,
                sellerName: listing.sellerName,
                price: listing.price,
                currency: listing.currency || 'EUR',
                status: 'pending_escrow', // Initial State
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const txRef = await addDoc(collection(db, 'transactions'), transactionData);

            // 3. Mark Listing as 'Sold' (Locked)
            await updateDoc(doc(db, 'listings', listing.id), {
                status: 'sold',
                buyerId: auth.currentUser.uid
            });

            // 4. Update Transaction to 'held_in_escrow' (Simulating successful payment)
            await updateDoc(txRef, {
                status: 'held_in_escrow',
                stripePaymentId: 'simulated_' + Date.now(),
                updatedAt: serverTimestamp()
            });

            this.showSuccessScreen(txRef.id);

        } catch (error) {
            console.error('Transaction failed:', error);
            alert('Purchase failed: ' + error.message);
        }
    }

    showPaymentModal(listing) {
        return new Promise((resolve) => {
            // Create Modal DOM
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center fade-in';
            modal.innerHTML = `
                <div class="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full relative">
                    <h2 class="text-2xl font-bold mb-6">Secure Checkout</h2>
                    
                    <div class="flex gap-4 mb-6">
                        <div class="w-20 h-20 bg-gray-800 rounded-lg overflow-hidden">
                            <img src="${listing.images ? listing.images[0] : ''}" class="w-full h-full object-cover">
                        </div>
                        <div>
                            <h3 class="font-bold">${listing.title}</h3>
                            <p class="text-xs text-gray-400">Sold by ${listing.sellerName}</p>
                            <p class="text-cyan-400 font-bold text-xl mt-1">${this.formatPrice(listing.price)}</p>
                        </div>
                    </div>

                    <div class="space-y-4 mb-8">
                        <div class="p-4 border border-gray-700 rounded bg-gray-800/50">
                            <label class="flex items-center gap-3 cursor-pointer">
                                <input type="radio" name="payment" checked class="text-cyan-400 focus:ring-cyan-400">
                                <span>Credit Card (Stripe)</span>
                            </label>
                        </div>
                        <div class="p-4 border border-gray-700 rounded bg-gray-800/50 opacity-50">
                             <label class="flex items-center gap-3">
                                <input type="radio" name="payment" disabled>
                                <span>PayPal (Coming Soon)</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="text-xs text-gray-500 mb-6 text-center">
                        <p>Funds will be held in <strong>Zentra Escrow</strong> until you confirm delivery.</p>
                    </div>

                    <div class="flex gap-3">
                        <button id="cancel-pay-btn" class="flex-1 btn-secondary">Cancel</button>
                        <button id="confirm-pay-btn" class="flex-1 btn-primary">Pay Now</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const close = (result) => {
                modal.remove();
                resolve(result);
            };

            document.getElementById('cancel-pay-btn').onclick = () => close(false);

            document.getElementById('confirm-pay-btn').onclick = () => {
                const btn = document.getElementById('confirm-pay-btn');
                btn.textContent = 'Processing...';
                btn.disabled = true;

                // Simulate network delay
                setTimeout(() => {
                    close(true);
                }, 1500);
            };
        });
    }

    showSuccessScreen(txId) {
        const root = document.getElementById('market-root');
        root.innerHTML = `
            <div class="min-h-[60vh] flex flex-col items-center justify-center text-center fade-in-up">
                <div class="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                    ✓
                </div>
                <h1 class="text-3xl font-bold mb-2">Payment Successful!</h1>
                <p class="text-gray-400 max-w-md mb-8">
                    Your funds are now securely held in Escrow. The seller has been notified to ship the item.
                </p>
                <div class="glass-panel p-4 mb-8 font-mono text-sm text-gray-300">
                    Transaction ID: ${txId}
                </div>
                <a href="/community/profile" class="btn-primary">View My Orders</a>
            </div>
        `;
    }

    formatPrice(cents) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
    }
}

import { db, collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, updateDoc, serverTimestamp, arrayUnion, limit } from './firebase-config.js';
import { Auth } from './auth.js';
import { Validator } from './validator.js';

export const Market = {
    async getListings(category = null) {
        // Sample Data for Prototype
        const sampleListings = [
            { id: 'sample_1', title: 'Tamiya F-14 Tomcat 1/48', price: 85, category: 'model-kits', condition: 'mint', images: ['https://images.unsplash.com/photo-1626017595304-453664d68249?auto=format&fit=crop&w=600&q=80'], description: 'Sealed box. 2016 tooling. Rare find.' },
            { id: 'sample_2', title: 'NVIDIA RTX 3080 FE', price: 450, category: 'hardware', condition: 'used', images: ['https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80'], description: 'Used for rendering only. Thermal pads replaced.' },
            { id: 'sample_3', title: 'Ender 3 Pro Modded', price: 120, category: 'maker-gear', condition: 'used', images: ['https://images.unsplash.com/photo-1631541909061-71e349d1f2e1?auto=format&fit=crop&w=600&q=80'], description: 'Silent mainboard installed. Glass bed included.' },
            { id: 'sample_4', title: 'Bandai PG Unleashed RX-78-2', price: 280, category: 'model-kits', condition: 'mint', images: ['https://images.unsplash.com/photo-1616719816556-9b0d24db67f6?auto=format&fit=crop&w=600&q=80'], description: 'New in box. Imported from Japan.' },
            { id: 'sample_5', title: 'Soldering Station Hakko', price: 90, category: 'maker-gear', condition: 'like-new', images: ['https://images.unsplash.com/photo-1595604246830-496a77d46f94?auto=format&fit=crop&w=600&q=80'], description: 'Used twice. Comes with extra tips.' }
        ];

        try {
            let q;
            const listingsRef = collection(db, 'listings');

            if (category && category !== 'all') {
                q = query(listingsRef, where('category', '==', category), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
            } else {
                q = query(listingsRef, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
            }

            const snapshot = await getDocs(q);
            const realListings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Merge for prototype feel (Real + Sample)
            let allListings = [...realListings, ...sampleListings];

            // Client-side filter for samples if DB query didn't catch them (since samples aren't in DB)
            if (category && category !== 'all') {
                allListings = allListings.filter(l => l.category === category);
            }

            return allListings;

        } catch (e) {
            console.warn("Firestore access limited, showing samples only.");
            if (category && category !== 'all') {
                return sampleListings.filter(l => l.category === category);
            }
            return sampleListings;
        }
    },

    async createListing(listingData) {
        if (!Auth.requireAuth()) return;

        // Validation
        const validation = Validator.validateListing(listingData);
        if (!validation.valid) throw new Error(validation.errors.join("\\n"));

        // Prepare Data Model
        const finalData = {
            ...listingData,
            sellerId: Auth.currentUser.uid,
            sellerName: Auth.currentUser.displayName || 'Anonymous',
            status: 'active',
            reputationScore: 0, // Placeholder, usually fetched from User profile
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'listings'), finalData);
        return docRef.id;
    },

    // --- Escrow State Machine ---

    async getTransactionForListing(listingId) {
        if (!Auth.currentUser) return null;

        // Check if I am buyer OR seller
        const q = query(
            collection(db, 'transactions'),
            where('listingId', '==', listingId),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    // 1. Initiate (Buyer clicks "Buy Now")
    async initiatePurchase(listingId) {
        if (!Auth.requireAuth()) return;

        const confirmed = confirm("Start secure transaction via Zentra Protect?");
        if (!confirmed) return;

        // Create 'initiated' tx
        const txData = {
            listingId,
            buyerId: Auth.currentUser.uid,
            status: 'initiated',
            history: [{ status: 'initiated', timestamp: new Date().toISOString() }],
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'transactions'), txData);
        window.location.reload();
    },

    // 2. Pay (Buyer clicks "Simulate Payment")
    async simulatePayment(txId) {
        const confirmed = confirm("SIMULATION: Approve payment of funds to Escrow?");
        if (!confirmed) return;

        await updateDoc(doc(db, 'transactions', txId), {
            status: 'paid_escrow',
            history: arrayUnion({ status: 'paid_escrow', timestamp: new Date().toISOString() })
        });

        // IMPORTANT: Also update listing status to 'reserved'
        // In a real app, this would be a cloud function trigger for security
        // Fetch tx to get listingId
        const txSnap = await getDoc(doc(db, 'transactions', txId));
        await updateDoc(doc(db, 'listings', txSnap.data().listingId), {
            status: 'reserved'
        });

        alert("Funds secured in Zentra Vault. Seller notified.");
    },

    // 3. Ship (Seller clicks "Mark Shipped")
    async markShipped(txId) {
        const tracking = prompt("Enter Tracking Number (Simulation):", "DHL-123456789");
        if (!tracking) return;

        await updateDoc(doc(db, 'transactions', txId), {
            status: 'shipped',
            trackingNumber: tracking,
            history: arrayUnion({ status: 'shipped', timestamp: new Date().toISOString() })
        });

        alert("Status updated. Buyer notified.");
    },

    // 4. Confirm (Buyer clicks "Confirm Receipt")
    async confirmReceipt(txId) {
        const confirmed = confirm("Confirm you have received the item and it matches the description? This releases funds to the seller.");
        if (!confirmed) return;

        // Release funds
        await updateDoc(doc(db, 'transactions', txId), {
            status: 'completed',
            history: arrayUnion({ status: 'completed', timestamp: new Date().toISOString() })
        });

        // Mark listing as sold
        const txSnap = await getDoc(doc(db, 'transactions', txId));
        await updateDoc(doc(db, 'listings', txSnap.data().listingId), {
            status: 'sold'
        });

        alert("Transaction Closed. Thank you for using Zentra.");
    }
};

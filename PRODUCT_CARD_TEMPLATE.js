// PREMIUM PRODUCT CARD TEMPLATE  
// This replaces lines 788-805 in build.js

// Generate Product Cards (Premium Modern Design)
const productCards = pageProducts.map(p => {
    // Calculate savings (if we have price history)
    const savingsPercent = Math.floor(Math.random() * 25) + 5; // Mock for now - integrate with Deal Intelligence later
    const showDealBadge = savingsPercent > 15;

    return `
    <div class="product-card" style="
        background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
    " onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 20px 40px rgba(0,240,255,0.15)'; this.style.borderColor='rgba(0,240,255,0.3)'" 
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='rgba(255,255,255,0.1)'">
        
        <!-- Image Container -->
        <div style="
            height: 240px;
            padding: 30px;
            background: radial-gradient(circle at top right, rgba(0,240,255,0.05), transparent 70%),
                        linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.1));
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        ">
            <img src="${p.merchant_image_url}" 
                 alt="${p.product_name}"
                 style="
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));
                    transition: transform 0.3s ease;
                 "
                 onerror="this.src='/assets/images/product-placeholder.png'">
            
            ${showDealBadge ? `
            <!-- Deal Badge -->
            <div style="
                position: absolute;
                top: 15px;
                left: 15px;
                background: linear-gradient(135deg, #ff6b6b, #ff8e53);
                color: white;
                font-size: 0.75rem;
                font-weight: 700;
                padding: 6px 12px;
                border-radius: 20px;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            ">
                🔥 -${savingsPercent}%
            </div>
            ` : ''}
            
            <!-- Merchant Badge -->
            <div style="
                position: absolute;
                bottom: 15px;
                right: 15px;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(0,240,255,0.3);
                color: rgba(255,255,255,0.9);
                font-size: 0.7rem;
                padding: 5px 10px;
                border-radius: 6px;
                font-family: 'JetBrains Mono', monospace;
            ">
                ${(p.merchant_name || 'Shop').substring(0, 15)}
            </div>
        </div>
        
        <!-- Content -->
        <div style="
            padding: 20px;
            flex: 1;
            display: flex;
            flex-direction: column;
            border-top: 1px solid rgba(255,255,255,0.05);
        ">
            <!-- Product Name -->
            <h3 style="
                font-size: 1rem;
                line-height: 1.5;
                margin-bottom: 15px;
                color: rgba(255,255,255,0.95);
                font-weight: 600;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                height: 3em;
            ">${p.product_name}</h3>
            
            <!-- Price & CTA -->
            <div style="margin-top: auto;">
                <div style="
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    margin-bottom: 15px;
                ">
                    <div>
                        <div style="
                            font-size: 2rem;
                            font-weight: 700;
                            font-family: 'JetBrains Mono', monospace;
                            background: linear-gradient(135deg, #00f0ff, #0080ff);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            line-height: 1;
                        ">${p.search_price}</div>
                        <div style="
                            font-size: 0.75rem;
                            color: rgba(255,255,255,0.5);
                            margin-top: 2px;
                        ">${p.currency || 'EUR'}</div>
                    </div>
                </div>
                
                <a href="${p.local_link}" 
                   style="
                       display: block;
                       width: 100%;
                       padding: 12px;
                       background: linear-gradient(135deg, rgba(0,240,255,0.1), rgba(0,80,255,0.1));
                       border: 1px solid rgba(0,240,255,0.3);
                       border-radius: 8px;
                       color: #00f0ff;
                       text-align: center;
                       text-decoration: none;
                       font-weight: 600;
                       font-size: 0.9rem;
                       transition: all 0.3s ease;
                   "
                   onmouseover="this.style.background='linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,80,255,0.2))'; this.style.borderColor='rgba(0,240,255,0.6)'; this.style.transform='translateY(-2px)'"
                   onmouseout="this.style.background='linear-gradient(135deg, rgba(0,240,255,0.1), rgba(0,80,255,0.1))'; this.style.borderColor='rgba(0,240,255,0.3)'; this.style.transform='translateY(0)'">
                    VIEW DETAILS →
                </a>
            </div>
        </div>
    </div>
    `;
}).join('');

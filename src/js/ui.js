export const UI = {
    init() {
        this.initParticles();
        this.initCursor();
        this.initTilt();
        this.initListeners();
    },

    initParticles() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width, height;

        // Configuration
        const config = {
            starCount: window.innerWidth < 768 ? 40 : 100, // Reduced on mobile
            starBaseSize: 1.5,
            scrollingSpeed: 0.2, // Base vertical drift
            dataPacketChance: 0.005, // Chance per frame to spawn a data packet
            accentColor: '0, 240, 255' // Cyan
        };

        let stars = [];
        let dataPackets = [];
        let cameraY = 0; // Simulated camera position

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            // Re-init if drastic change, or just let update loop handle it
        }

        class Star {
            constructor() {
                this.reset(true);
            }

            reset(randomY = false) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : -10;
                this.z = Math.random() * 2 + 0.5; // Depth multiplier
                this.size = Math.random() * config.starBaseSize;
                this.opacity = Math.random() * 0.5 + 0.1;
            }

            update() {
                // Parallax scroll
                this.y += config.scrollingSpeed * this.z;

                // Reset if off bottom screen
                if (this.y > height) {
                    this.reset();
                }
            }

            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        class DataPacket {
            constructor() {
                this.x = Math.random() * width;
                this.y = -50;
                this.speed = Math.random() * 5 + 5;
                this.length = Math.random() * 50 + 20;
                this.width = Math.random() * 2 + 1;
                this.opacity = Math.random() * 0.5 + 0.3;
                this.dead = false;
            }

            update() {
                this.y += this.speed;
                if (this.y > height + 100) {
                    this.dead = true;
                }
            }

            draw() {
                const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y - this.length);
                gradient.addColorStop(0, `rgba(${config.accentColor}, 0)`);
                gradient.addColorStop(0.5, `rgba(${config.accentColor}, ${this.opacity})`);
                gradient.addColorStop(1, `rgba(${config.accentColor}, 0)`);

                ctx.fillStyle = gradient;
                ctx.fillRect(this.x, this.y - this.length, this.width, this.length);
            }
        }

        function init() {
            stars = [];
            for (let i = 0; i < config.starCount; i++) {
                stars.push(new Star());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            // 1. Draw Stars (Background Layer)
            stars.forEach(star => {
                star.update();
                star.draw();
            });

            // 2. Manage Data Packets (Active Layer)
            if (Math.random() < config.dataPacketChance) {
                dataPackets.push(new DataPacket());
            }

            dataPackets = dataPackets.filter(p => !p.dead);
            dataPackets.forEach(p => {
                p.update();
                p.draw();
            });

            // 3. Subtle Camera Drift (Global transform for next frame?)
            // For now, simple parallax is efficient enough without complex transforms.

            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        resize();
        init();
        animate();
    },

    initCursor() {
        const dot = document.querySelector('.cursor-dot');
        const outline = document.querySelector('.cursor-outline');
        if (!dot || !outline) return;

        window.addEventListener('mousemove', (e) => {
            const x = e.clientX;
            const y = e.clientY;
            dot.style.left = `${x}px`;
            dot.style.top = `${y}px`;

            outline.animate({
                left: `${x}px`,
                top: `${y}px`
            }, { duration: 500, fill: "forwards" });
        });
    },

    initTilt() {
        const cards = document.querySelectorAll('.card, .glass-panel');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -5;
                const rotateY = ((x - centerX) / centerX) * 5;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    },

    initListeners() {
        // Universal listeners
    }
};

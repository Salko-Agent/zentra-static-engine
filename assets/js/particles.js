// Standard Particle Animation (Restored)
// Stable Version - Lightweight

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];

// Configuration - Restored to original values
const particleCount = 80;
const connectionDistance = 250;
const fov = 600;
const depth = 1000;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

class Particle {
    constructor(text = null) {
        this.text = text;
        this.reset(true);
    }

    reset(randomZ = false) {
        this.x = (Math.random() - 0.5) * width * 2;
        this.y = (Math.random() - 0.5) * height * 2;
        this.z = randomZ ? (Math.random() - 0.5) * depth : depth / 2;

        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.vz = Math.random() * 1.5 + 0.5;

        this.size = Math.random() * 2 + 1;
        this.baseColor = Math.random() > 0.5 ? { r: 204, g: 255, b: 0 } : { r: 16, g: 185, b: 129 }; // Lime or Emerald

        if (this.text) {
            this.size = 1.5; // Base size for text scaling
            this.vx *= 0.5; // Text moves slower/smoother
            this.vy *= 0.5;
            // Text particles are always Cyan or White-ish for readability
            if (this.text.includes("BMS")) {
                this.baseColor = { r: 255, g: 255, b: 255 }; // White for BMS
            } else {
                this.baseColor = { r: 204, g: 255, b: 0 }; // Lime for Zentra
            }
        }

        this.ix = 0;
        this.iy = 0;
    }

    update() {
        this.z -= this.vz;
        this.x += this.vx;
        this.y += this.vy;

        if (this.z < -fov / 2) {
            this.reset();
            this.z = depth / 2;
        }

        this.ix *= 0.95;
        this.iy *= 0.95;
    }

    getProjected(mouse) {
        let px = this.x + this.ix;
        let py = this.y + this.iy;

        px += (mouse.x - width / 2) * (this.z / depth) * 0.5;
        py += (mouse.y - height / 2) * (this.z / depth) * 0.5;

        const scale = fov / (fov + this.z);
        const x2d = px * scale + width / 2;
        const y2d = py * scale + height / 2;

        return { x: x2d, y: y2d, scale: scale, z: this.z };
    }
}

function initParticles() {
    particles = [];
    // Regular particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    // Text particles
    const words = ["Zentra Services", "BMS DIGITAL SOLUTIONS"];
    for (let i = 0; i < 12; i++) {
        const word = words[i % words.length];
        particles.push(new Particle(word));
    }
}

let mouse = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('resize', () => {
    resize();
    initParticles();
});

function animate() {
    ctx.clearRect(0, 0, width, height);

    const projected = [];

    for (const p of particles) {
        p.update();
        const proj = p.getProjected(mouse);
        projected.push({ p, proj });

        const dx = proj.x - mouse.x;
        const dy = proj.y - mouse.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 200) {
            const force = (200 - dist) / 200;
            const angle = Math.atan2(dy, dx);
            p.ix += Math.cos(angle) * force * 5;
            p.iy += Math.sin(angle) * force * 5;
        }
    }

    // Draw connections (only for non-text particles to keep text clean)
    ctx.lineWidth = 1;
    for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (p1.p.text) continue; // Skip connections for text

        for (let j = i + 1; j < projected.length; j++) {
            const p2 = projected[j];
            if (p2.p.text) continue; // Skip connections for text

            const dx = p1.p.x - p2.p.x;
            const dy = p1.p.y - p2.p.y;
            const dz = p1.p.z - p2.p.z;
            const dist3d = Math.hypot(dx, dy, dz);

            if (dist3d < connectionDistance) {
                const depthAlpha = 1 - (p1.p.z + depth / 2) / (depth * 1.5);
                const distAlpha = 1 - dist3d / connectionDistance;
                const alpha = depthAlpha * distAlpha * 0.3;

                if (alpha > 0.01) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.moveTo(p1.proj.x, p1.proj.y);
                    ctx.lineTo(p2.proj.x, p2.proj.y);
                    ctx.stroke();
                }
            }
        }
    }

    // Draw particles and text
    for (const p1 of projected) {
        const size = p1.p.size * p1.proj.scale;

        let alpha = 1;
        if (p1.p.z > depth / 3) alpha = 1 - (p1.p.z - depth / 3) / (depth / 2);
        if (p1.p.z < -200) alpha = (p1.p.z + 400) / 200;

        if (alpha > 0) {
            ctx.fillStyle = `rgba(${p1.p.baseColor.r}, ${p1.p.baseColor.g}, ${p1.p.baseColor.b}, ${alpha})`;

            if (p1.p.text) {
                // Text rendering
                const fontSize = Math.max(10, size * 10); // Scale text size
                ctx.font = `600 ${fontSize}px 'Inter', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p1.p.text, p1.proj.x, p1.proj.y);
            } else {
                // Dot rendering
                ctx.beginPath();
                ctx.arc(p1.proj.x, p1.proj.y, Math.max(0, size), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    requestAnimationFrame(animate);
}

// Initialize
if (canvas) {
    resize();
    initParticles();
    animate();
    console.log('[Particle Animation] Initialized Stable Version (v1.0)');
}

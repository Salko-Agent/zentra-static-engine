document.addEventListener('DOMContentLoaded', () => {
    console.log('Zentra.Services v2.0 Loaded');

    // Particle effect enhancement (optional JS interaction)
    const particles = document.querySelector('.particles');
    if (particles) {
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            particles.style.transform = `translate(-${x * 20}px, -${y * 20}px)`;
        });
    }
});

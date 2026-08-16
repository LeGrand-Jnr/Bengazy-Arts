// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Form submission handling
const bookingForm = document.querySelector('.booking-form');
if (bookingForm) {
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Thank you for your commission request! I will contact you within 24 hours to discuss the details.');
        bookingForm.reset();
    });
}

// Gallery filtering
const filterButtons = document.querySelectorAll('[role="group"] button');
filterButtons.forEach(button => {
    button.addEventListener('click', function() {
        filterButtons.forEach(btn => btn.classList.remove('bg-secondary', 'text-white', 'border-secondary'));
        filterButtons.forEach(btn => btn.classList.add('bg-white', 'text-gray-900', 'border-gray-200'));
        
        this.classList.remove('bg-white', 'text-gray-900', 'border-gray-200');
        this.classList.add('bg-secondary', 'text-white', 'border-secondary');
    });
});

// Gallery rendering & modal
(function () {
    const API_BASE = (window.location.origin && window.location.origin !== 'null')
        ? window.location.origin
        : 'http://localhost:8000';

    async function fetchGallery() {
        try {
            const response = await fetch(`${API_BASE}/api/gallery`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            return [];
        }
    }

    function createCard(item, idx) {
        const el = document.createElement('div');
        el.className = 'artwork-card bg-white rounded-lg overflow-hidden shadow-lg cursor-pointer gallery-item';
        el.innerHTML = `
            <div class="relative">
                <img src="${item.cover}" alt="${item.title}" class="w-full h-64 object-cover">
                <div class="artwork-overlay absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center opacity-0 transition-opacity duration-300">
                    <div class="text-center text-white p-4">
                        <h3 class="text-xl font-bold mb-2">${item.title}</h3>
                        <p class="mb-4">${item.artist || 'Bengazy'}</p>
                        <button class="bg-secondary hover:bg-accent text-white py-2 px-4 rounded-full">View Details</button>
                    </div>
                </div>
            </div>
        `;
        el.dataset.idx = idx;
        return el;
    }

    function openModal(item) {
        const modal = document.getElementById('artworkModal');
        if (!modal || !item) return;

        document.getElementById('modalTitle').textContent = item.title;
        document.getElementById('modalCover').src = item.cover;
        document.getElementById('modalDescription').textContent = item.description || 'No detailed notes yet.';
        document.getElementById('modalArtist').textContent = item.artist || 'Bengazy';
        document.getElementById('modalPrice').textContent = item.price ? `$${item.price}` : 'N/A';
        document.getElementById('notes').textContent = item.description || 'No detailed notes yet.';

        const strip = document.getElementById('progressStrip');
        strip.innerHTML = '';
        (item.progress || []).forEach((src) => {
            const img = document.createElement('img');
            img.src = src;
            img.className = 'thumb cursor-pointer';
            img.alt = item.title;
            img.addEventListener('click', () => {
                document.getElementById('modalCover').src = src;
            });
            strip.appendChild(img);
        });

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    async function renderGallery() {
        const container = document.getElementById('galleryGrid');
        if (!container) return;

        const items = await fetchGallery();
        if (!items.length) {
            container.innerHTML = '<div class="col-span-full text-center text-gray-600">No artwork uploaded yet.</div>';
            return;
        }

        container.innerHTML = '';
        items.forEach((item, idx) => {
            const card = createCard(item, idx);
            card.addEventListener('click', () => openModal(item));
            container.appendChild(card);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderGallery();

        const modal = document.getElementById('artworkModal');
        document.getElementById('modalClose')?.addEventListener('click', () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });

        document.getElementById('revealNotes')?.addEventListener('click', () => {
            document.getElementById('notes').classList.toggle('hidden');
        });
    });
})();

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
(function(){
    function loadGallery(){ try { return JSON.parse(localStorage.getItem('galleryItems')||'[]'); } catch(e){ return []; } }

    function createCard(item, idx){
        const el = document.createElement('div');
        el.className = 'artwork-card bg-white rounded-lg overflow-hidden shadow-lg cursor-pointer gallery-item';
        el.innerHTML = `
            <div class="relative">
                <img src="${item.cover}" alt="${item.title}" class="w-full h-64 object-cover">
                <div class="artwork-overlay absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center opacity-0 transition-opacity duration-300">
                    <div class="text-center text-white p-4">
                        <h3 class="text-xl font-bold mb-2">${item.title}</h3>
                        <p class="mb-4">${item.artist || ''}</p>
                        <button class="bg-secondary hover:bg-accent text-white py-2 px-4 rounded-full">View Details</button>
                    </div>
                </div>
            </div>`;
        el.dataset.idx = idx;
        return el;
    }

    function renderGallery(){
        const container = document.getElementById('galleryGrid');
        if(!container) return;
        const items = loadGallery();
        if(items.length===0){
            container.innerHTML = `
                <div class="col-span-full text-center text-gray-600">No artworks uploaded yet. Artist can add via <a href=\"admin.html\" class=\"text-secondary\">Admin Panel</a>.</div>`;
            return;
        }
        container.innerHTML = '';
        items.forEach((it, i)=> container.appendChild(createCard(it,i)));

        // add click handlers
        container.querySelectorAll('.artwork-card').forEach(card=>{
            card.addEventListener('click', ()=> openModal(Number(card.dataset.idx)));
        });
    }

    function openModal(idx){
        const items = loadGallery();
        const item = items[idx];
        if(!item) return;
        document.getElementById('modalTitle').textContent = item.title;
        document.getElementById('modalCover').src = item.cover;
        document.getElementById('modalDescription').textContent = item.description || '';
        document.getElementById('modalArtist').textContent = item.artist || '';
        document.getElementById('modalPrice').textContent = item.price ? `$${item.price}` : 'N/A';
        document.getElementById('notes').textContent = item.description || '';

        const strip = document.getElementById('progressStrip');
        strip.innerHTML = '';
        (item.progress || []).forEach(src=>{
            const t = document.createElement('img');
            t.src = src; t.className = 'thumb cursor-pointer';
            t.addEventListener('click', ()=> document.getElementById('modalCover').src = src);
            strip.appendChild(t);
        });

        document.getElementById('artworkModal').classList.remove('hidden');
        document.getElementById('artworkModal').classList.add('flex');
    }

    document.getElementById('modalClose')?.addEventListener('click', ()=>{
        document.getElementById('artworkModal').classList.add('hidden');
        document.getElementById('artworkModal').classList.remove('flex');
    });

    document.getElementById('revealNotes')?.addEventListener('click', ()=>{
        const notes = document.getElementById('notes');
        notes.classList.toggle('hidden');
    });

    // initialize
    if (document.readyState !== 'loading') renderGallery();
    else document.addEventListener('DOMContentLoaded', renderGallery);
})();

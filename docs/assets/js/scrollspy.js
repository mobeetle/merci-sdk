// Simple scrollspy for aside navigation, specific to this page
(function() {
    const sections = document.querySelectorAll('section[id]');
    const asideLinks = document.querySelectorAll('.aside-link, .aside-link-active');

    const onScroll = () => {
        const scrollPosition = window.pageYOffset;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;

        let currentSectionId = '';

        // Check if user is at the very bottom of the page
        if (scrollHeight - scrollPosition - clientHeight < 150) { // 150px threshold from bottom
            currentSectionId = sections[sections.length - 1].getAttribute('id');
        } else {
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (scrollPosition >= sectionTop - 100) { // 100px offset for sticky header
                    currentSectionId = section.getAttribute('id');
                }
            });
        }

        asideLinks.forEach(link => {
            link.classList.remove('aside-link-active', 'font-semibold');
            link.classList.add('aside-link');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('aside-link-active', 'font-semibold');
                link.classList.remove('aside-link');
            }
        });
    };

    window.addEventListener('scroll', onScroll);
    onScroll(); // Initial check on page load
})();
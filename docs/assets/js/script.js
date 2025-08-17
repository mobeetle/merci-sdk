/* assets/js/script.js */

(function() {
    'use strict';

    // --- Theme Toggle Functionality with Persistence ---
    const htmlEl = document.documentElement;
    const themeToggleButtons = document.querySelectorAll('.theme-toggle-btn');
    const themeToggleText = document.querySelectorAll('.theme-toggle-text');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            htmlEl.classList.add('dark');
            themeToggleText.forEach(el => el.textContent = 'Light Mode');
        } else {
            htmlEl.classList.remove('dark');
            themeToggleText.forEach(el => el.textContent = 'Dark Mode');
        }
    };

    const toggleTheme = () => {
        const currentTheme = htmlEl.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    };

    themeToggleButtons.forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });

    // Initialize theme on page load
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));


    // --- Mobile Menu Toggle Functionality ---
    const menuToggleBtn = document.getElementById('menu-toggle');
    const menuContent = document.getElementById('menu-content');

    if (menuToggleBtn && menuContent) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuContent.classList.toggle('hidden');
        });
    }

    // --- Copy Code Button Functionality ---
    const allCopyButtons = document.querySelectorAll('.copy-code-btn');
    allCopyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wrapper = e.currentTarget.closest('.code-block-wrapper');
            const codeBlock = wrapper.querySelector('code');
            if (!codeBlock) return;

            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                const originalContent = e.currentTarget.innerHTML;
                e.currentTarget.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="text-green-400" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
                    <span class="text-green-400">Copied!</span>`;
                setTimeout(() => {
                    e.currentTarget.innerHTML = originalContent;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    });

})();
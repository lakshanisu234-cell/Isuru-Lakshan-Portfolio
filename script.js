// ============================================
// PORTFOLIO WEBSITE FOR ISURU LAKSHAN
// Optimized version with fixes applied
// ============================================

'use strict';

class PortfolioApp {
    constructor() {
        // App State
        this.isLoading = true;
        this.loadProgress = 0;
        this.currentSection = 'home';
        this.isMobile = window.innerWidth < 768;
        this.isTablet = window.innerWidth < 992;
        this.hasUserInteracted = false;
        this.skillsInitialized = false;      // Flag to prevent double init

        // Event listeners storage for cleanup
        this.eventListeners = [];

        // 3D Systems
        this.heroScene = null;
        this.active3DScenes = new Map();
        this.popup3DScenes = new Map();

        // Animation System
        this.animationFrame = null;
        this.scrollAnimation = {
            ease: 0.1,
            current: 0,
            target: 0,
            last: 0
        };

        // Cursor System
        this.cursor = {
            x: 0,
            y: 0,
            lastX: 0,
            lastY: 0,
            speed: 0.1
        };

        this.cursorStates = {
            isInPopup: false,
            activeState: 'default',
            popupElement: null
        };

        // Performance tracking (disabled in production)
        this.performance = window.location.hostname === 'localhost' ? {
            lastFrameTime: 0,
            fps: 0,
            lastFPSUpdate: 0
        } : null;

        // Focus trap handlers for popups
        this.focusTrapHandlers = new Map();

        // Filter timeouts
        this.filterTimeout = null;

        // Initialize
        this.init();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        try {
            console.log('🚀 Initializing Portfolio Application...');

            // Core setup
            this.setupEventListeners();
            this.initLoading();
            this.initCursor();

            // Feature detection and initialization
            if (!this.isMobile && this.shouldInit3D()) {
                // Hero 3D scene – will only run if canvas exists
                this.initHeroScene();
                
                // Defer section 3D init
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => this.initSection3DScenes(), { timeout: 2000 });
                } else {
                    setTimeout(() => this.initSection3DScenes(), 1000);
                }
            }

            // Portfolio setup
            this.initPortfolioSystem();
            this.initForm();

            // Skills section (progress bars etc.)
            setTimeout(() => {
                if (!this.skillsInitialized) {
                    this.initSkillsSection();
                }
            }, 500);

            // Lazy-load popup images
            this.lazyLoadPopupImages();

            // Final setup
            this.updateCurrentYear();
            this.initScrollAnimations();

            // Start animation loop
            this.startAnimationLoop();

            console.log('✅ Application initialized successfully');

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showErrorUI(error);
        }
    }

    lazyLoadPopupImages() {
        const popups = document.querySelectorAll('.portfolio-popup');
        popups.forEach(popup => {
            const images = popup.querySelectorAll('img');
            images.forEach(img => {
                if (!img.hasAttribute('loading')) {
                    img.setAttribute('loading', 'lazy');
                }
            });
        });
    }

    // ============================================
    // LOADING SYSTEM
    // ============================================

    initLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');

        if (!loadingScreen || !progressFill || !progressText) {
            this.isLoading = false;
            document.body.classList.add('loaded');
            return;
        }

        progressFill.style.width = '0%';
        progressText.textContent = '0%';

        const duration = 2500;
        const startTime = performance.now();

        const animateProgress = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const percent = Math.floor(progress * 100);

            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;

            if (progress < 1) {
                requestAnimationFrame(animateProgress);
            } else {
                this.finishLoading(loadingScreen);
            }
        };

        requestAnimationFrame(animateProgress);
    }

    finishLoading(loadingScreen) {
        setTimeout(() => {
            loadingScreen.classList.add('loaded');
            this.isLoading = false;
            document.body.classList.add('loaded');
        }, 500);
    }

    // ============================================
    // 3D SYSTEMS
    // ============================================

    shouldInit3D() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (error) {
            return false;
        }
    }

    /* ---------- Hero Scene (foreground floating shapes) ---------- */
    initHeroScene() {
        const canvas = document.getElementById('home-canvas');
        if (!canvas) {
            console.warn('Hero canvas not found – skipping 3D scene');
            return;
        }

        try {
            const scene = new THREE.Scene();
            scene.background = null;

            const camera = new THREE.PerspectiveCamera(
                60,
                canvas.clientWidth / canvas.clientHeight,
                0.1,
                1000
            );
            camera.position.z = 15;

            const renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xcc00ff, 1);
            directionalLight.position.set(5, 5, 5);
            scene.add(directionalLight);

            const pointLight = new THREE.PointLight(0x00ccff, 0.8, 100);
            pointLight.position.set(-5, -5, 5);
            scene.add(pointLight);

            const particles = this.createHeroParticleSystem();
            scene.add(particles);

            const geometries = [
                new THREE.IcosahedronGeometry(1.2, 0),
                new THREE.TorusKnotGeometry(1, 0.3, 100, 16),
                new THREE.OctahedronGeometry(1, 0),
                new THREE.DodecahedronGeometry(1, 0)
            ];

            const objects = [];

            geometries.forEach((geometry, index) => {
                const material = new THREE.MeshStandardMaterial({
                    color: index % 2 === 0 ? 0xcc00ff : 0x00ccff,
                    metalness: 0.7,
                    roughness: 0.2,
                    transparent: true,
                    opacity: 0.8
                });

                const mesh = new THREE.Mesh(geometry, material);

                const radius = 6;
                const theta = (index / geometries.length) * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
                mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
                mesh.position.z = radius * Math.cos(phi);

                mesh.userData = {
                    speed: 0.2 + Math.random() * 0.3,
                    rotationSpeed: new THREE.Vector3(
                        Math.random() * 0.01 - 0.005,
                        Math.random() * 0.01 - 0.005,
                        Math.random() * 0.01 - 0.005
                    ),
                    originalPosition: mesh.position.clone(),
                    timeOffset: Math.random() * Math.PI * 2
                };

                scene.add(mesh);
                objects.push(mesh);
            });

            this.heroScene = {
                scene,
                camera,
                renderer,
                objects,
                particles,
                animationId: null
            };

            this.animateHeroScene();

        } catch (error) {
            console.error('Failed to initialize hero scene:', error);
            this.heroScene = null;
        }
    }

    createHeroParticleSystem() {
        const particleCount = this.isMobile ? 800 : 1500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const color1 = new THREE.Color(0xcc00ff);
        const color2 = new THREE.Color(0x00ccff);

        for (let i = 0; i < particleCount * 3; i += 3) {
            const radius = 12;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);

            const mix = Math.random();
            const color = color1.clone().lerp(color2, mix);

            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        return new THREE.Points(geometry, material);
    }

    animateHeroScene() {
        if (!this.heroScene) return;

        const animate = (time) => {
            this.heroScene.animationId = requestAnimationFrame(animate);
            this.updateHeroScene(time);
            this.heroScene.renderer.render(this.heroScene.scene, this.heroScene.camera);
        };

        animate();
    }

    updateHeroScene(time) {
        if (!this.heroScene || !this.heroScene.objects) return;

        const t = time * 0.001;

        this.heroScene.objects.forEach((obj, index) => {
            if (obj.userData) {
                const floatY = Math.sin(t * obj.userData.speed + obj.userData.timeOffset) * 0.5;
                const floatX = Math.cos(t * obj.userData.speed * 0.7 + obj.userData.timeOffset) * 0.3;

                obj.position.y = obj.userData.originalPosition.y + floatY;
                obj.position.x = obj.userData.originalPosition.x + floatX;

                obj.rotation.x += obj.userData.rotationSpeed.x;
                obj.rotation.y += obj.userData.rotationSpeed.y;
                obj.rotation.z += obj.userData.rotationSpeed.z;

                const pulse = 1 + Math.sin(t * 1.5 + index) * 0.1;
                obj.scale.set(pulse, pulse, pulse);
            }
        });

        if (this.heroScene.particles) {
            this.heroScene.particles.rotation.y += 0.001;
        }
    }

    /* ---------- Section 3D Backgrounds ---------- */
    initSection3DScenes() {
        if (this.isMobile) return;

        const sections = [
            { id: 'home', canvasId: 'home-canvas', color1: 0xcc00ff, color2: 0x00ccff, shape: 'torus' },
            { id: 'about', canvasId: 'about-canvas', color1: 0xcc00ff, color2: 0x00ccff, shape: 'torus' },
            { id: 'skills', canvasId: 'skills-canvas', color1: 0xaa44ff, color2: 0x44aaff, shape: 'sphere' },
            { id: 'portfolio', canvasId: 'portfolio-canvas', color1: 0xcc00ff, color2: 0x00ccff, shape: 'cube' },
            { id: 'contact', canvasId: 'contact-canvas', color1: 0x3366ff, color2: 0x66ccff, shape: 'icosahedron' }
        ];

        sections.forEach(section => {
            const canvas = document.getElementById(section.canvasId);
            if (!canvas) {
                console.warn(`Canvas #${section.canvasId} not found – skipping 3D for ${section.id}`);
                return;
            }

            try {
                const scene = new THREE.Scene();
                scene.background = null;

                const camera = new THREE.PerspectiveCamera(
                    60,
                    canvas.clientWidth / canvas.clientHeight,
                    0.1,
                    1000
                );
                camera.position.z = 15;

                const renderer = new THREE.WebGLRenderer({
                    canvas,
                    alpha: true,
                    antialias: true,
                    powerPreference: 'high-performance'
                });
                renderer.setSize(canvas.clientWidth, canvas.clientHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                scene.add(ambientLight);

                const directionalLight1 = new THREE.DirectionalLight(section.color1, 0.8);
                directionalLight1.position.set(5, 5, 5);
                scene.add(directionalLight1);

                const directionalLight2 = new THREE.DirectionalLight(section.color2, 0.8);
                directionalLight2.position.set(-5, -5, 5);
                scene.add(directionalLight2);

                let geometry;
                switch (section.shape) {
                    case 'torus':
                        geometry = new THREE.TorusGeometry(2, 0.8, 32, 64);
                        break;
                    case 'sphere':
                        geometry = new THREE.SphereGeometry(2, 32, 32);
                        break;
                    case 'cube':
                        geometry = new THREE.BoxGeometry(3, 3, 3);
                        break;
                    case 'icosahedron':
                        geometry = new THREE.IcosahedronGeometry(2, 1);
                        break;
                    default:
                        geometry = new THREE.TorusKnotGeometry(1.5, 0.4, 100, 16);
                }

                const material = new THREE.MeshStandardMaterial({
                    color: section.color1,
                    emissive: section.color2,
                    emissiveIntensity: 0.3,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.3
                });

                const mainMesh = new THREE.Mesh(geometry, material);
                scene.add(mainMesh);

                const particleCount = this.isMobile ? 300 : 800;
                const particleGeo = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);
                const colors = new Float32Array(particleCount * 3);

                const color1 = new THREE.Color(section.color1);
                const color2 = new THREE.Color(section.color2);

                for (let i = 0; i < particleCount * 3; i += 3) {
                    const radius = 8;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);

                    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
                    positions[i+1] = radius * Math.sin(phi) * Math.sin(theta);
                    positions[i+2] = radius * Math.cos(phi);

                    const mix = Math.random();
                    const color = color1.clone().lerp(color2, mix);
                    colors[i] = color.r;
                    colors[i+1] = color.g;
                    colors[i+2] = color.b;
                }

                particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                const particleMat = new THREE.PointsMaterial({
                    size: 0.1,
                    vertexColors: true,
                    transparent: true,
                    opacity: 0.4,
                    blending: THREE.AdditiveBlending
                });

                const particles = new THREE.Points(particleGeo, particleMat);
                scene.add(particles);

                const sceneData = {
                    scene,
                    camera,
                    renderer,
                    mainMesh,
                    particles,
                    animationId: null,
                    speed: 0.001 + Math.random() * 0.002
                };

                this.active3DScenes.set(section.id, sceneData);

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        const data = this.active3DScenes.get(section.id);
                        if (!data) return;
                        if (entry.isIntersecting) {
                            if (!data.animationId) {
                                this.animateSectionScene(section.id);
                            }
                        } else {
                            if (data.animationId) {
                                cancelAnimationFrame(data.animationId);
                                data.animationId = null;
                            }
                        }
                    });
                }, { threshold: 0.1 });
                observer.observe(document.getElementById(section.id));

            } catch (error) {
                console.error(`Failed to initialize 3D scene for ${section.id}:`, error);
            }
        });
    }

    animateSectionScene(sectionId) {
        const sceneData = this.active3DScenes.get(sectionId);
        if (!sceneData) return;

        const animate = (time) => {
            sceneData.animationId = requestAnimationFrame(animate);

            const t = time * 0.001;

            if (sceneData.mainMesh) {
                sceneData.mainMesh.rotation.x += 0.002;
                sceneData.mainMesh.rotation.y += 0.003;

                const scale = 1 + Math.sin(t * 2) * 0.05;
                sceneData.mainMesh.scale.set(scale, scale, scale);
            }

            if (sceneData.particles) {
                sceneData.particles.rotation.y += sceneData.speed;
            }

            sceneData.renderer.render(sceneData.scene, sceneData.camera);
        };

        animate();
    }

    // ============================================
    // SKILLS SECTION (progress bars)
    // ============================================

    animateSkillBars() {
        const skillBars = document.querySelectorAll('.skill-modern-bar-fill');
        if (!skillBars.length) return;

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const bar = entry.target;
                        const width = bar.dataset.width;
                        setTimeout(() => {
                            bar.style.width = `${width}%`;
                        }, 200);
                        observer.unobserve(bar);
                    }
                });
            }, { threshold: 0.3 });

            skillBars.forEach(bar => observer.observe(bar));
        } else {
            skillBars.forEach(bar => {
                bar.style.width = `${bar.dataset.width}%`;
            });
        }
    }

    animateSkillsEntrance() {
        const cards = document.querySelectorAll('.skill-modern-card');
        if (!cards.length) return;

        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 300 + index * 200);
        });
    }

    initSkillsSection() {
        if (this.skillsInitialized) return;

        const skillsSection = document.querySelector('.skills-section');
        if (!skillsSection) {
            console.warn('⚠️ Skills section not found');
            return;
        }

        this.animateSkillBars();
        this.animateSkillsEntrance();

        this.skillsInitialized = true;
        console.log('✅ Modern Skills Section Initialized');
    }

    // ============================================
    // CURSOR SYSTEM
    // ============================================

    initCursor() {
        if (this.isMobile) return;

        this.cursorElement = document.querySelector('.custom-cursor');
        this.cursorFollower = document.querySelector('.cursor-follower');

        if (this.cursorElement && this.cursorFollower) {
            document.body.style.cursor = 'none';
        }
    }

    updateCursor() {
        if (this.isMobile || !this.cursorElement) return;

        this.cursor.lastX += (this.cursor.x - this.cursor.lastX) * this.cursor.speed;
        this.cursor.lastY += (this.cursor.y - this.cursor.lastY) * this.cursor.speed;

        this.cursorElement.style.left = `${this.cursor.lastX}px`;
        this.cursorElement.style.top = `${this.cursor.lastY}px`;

        if (this.cursorFollower) {
            const followerX = this.cursor.lastX + (this.cursor.x - this.cursor.lastX) * 0.5;
            const followerY = this.cursor.lastY + (this.cursor.y - this.cursor.lastY) * 0.5;

            this.cursorFollower.style.left = `${followerX}px`;
            this.cursorFollower.style.top = `${followerY}px`;

            this.updateCursorState();
        }
    }

    updateCursorState() {
        if (!this.cursorFollower || this.isMobile) return;

        const stateClasses = [
            'popup-hover',
            'popup-close-hover',
            'popup-image-hover',
            'popup-button-hover',
            'popup-thumbnail-hover',
            'popup-click'
        ];

        stateClasses.forEach(cls => {
            this.cursorFollower.classList.remove(cls);
        });

        if (this.cursorStates.activeState && this.cursorStates.isInPopup) {
            this.cursorFollower.classList.add(this.cursorStates.activeState);
        }
    }

    setCursorState(state, duration = null) {
        if (!this.cursorFollower || this.isMobile || !this.cursorStates.isInPopup) return;

        this.cursorStates.activeState = state;

        const stateClasses = [
            'popup-hover',
            'popup-close-hover',
            'popup-image-hover',
            'popup-button-hover',
            'popup-thumbnail-hover',
            'popup-click'
        ];

        stateClasses.forEach(cls => {
            this.cursorFollower.classList.remove(cls);
        });

        if (state) {
            this.cursorFollower.classList.add(state);
        }

        if (duration && state) {
            setTimeout(() => {
                this.cursorFollower.classList.remove(state);
                this.cursorStates.activeState = 'popup-hover';
                this.cursorFollower.classList.add('popup-hover');
            }, duration);
        }
    }

    setupPopupCursorEvents(popup) {
        if (this.isMobile || !this.cursorFollower || popup._cursorEventsSet) return;

        const popupContent = popup.querySelector('.popup-content');
        if (!popupContent) return;

        this.cursorStates.isInPopup = true;
        this.cursorStates.popupElement = popup;
        this.setCursorState('popup-hover');

        const mouseMoveHandler = (e) => {
            if (!this.cursorStates.isInPopup) return;

            this.cursor.x = e.clientX;
            this.cursor.y = e.clientY;
            this.updatePopupCursorHoverState(e);
        };

        const mouseDownHandler = () => {
            this.setCursorState('popup-click', 300);
        };

        const mouseUpHandler = () => {
            this.setCursorState('popup-hover', 100);
        };

        this.addEventListener(popupContent, 'mousemove', mouseMoveHandler);
        this.addEventListener(popupContent, 'mousedown', mouseDownHandler);
        this.addEventListener(popupContent, 'mouseup', mouseUpHandler);

        this.setupPopupElementHoverEffects(popup);

        popup._cursorHandlers = {
            mouseMoveHandler,
            mouseDownHandler,
            mouseUpHandler
        };
        popup._cursorEventsSet = true;
    }

    updatePopupCursorHoverState(e) {
        if (!this.cursorStates.isInPopup) return;

        const target = e.target;

        if (target.closest('.popup-close')) {
            this.setCursorState('popup-close-hover');
        } else if (target.closest('.popup-image-item, .popup-image img, .gallery-item, .multi-popup-gallery img')) {
            this.setCursorState('popup-image-hover');
        } else if (target.closest('.btn, .btn-view, .popup-links .btn, .btn-primary, .btn-secondary')) {
            this.setCursorState('popup-button-hover');
        } else if (target.closest('.thumbnail, .thumbnail-nav, .tech-tag')) {
            this.setCursorState('popup-thumbnail-hover');
        } else if (target.closest('.popup-content')) {
            this.setCursorState('popup-hover');
        }
    }

    setupPopupElementHoverEffects(popup) {
        const selectors = [
            '.popup-close',
            '.popup-image-item',
            '.gallery-item',
            '.multi-popup-gallery img',
            '.btn',
            '.btn-view',
            '.popup-links .btn',
            '.btn-primary',
            '.btn-secondary',
            '.tech-tag',
            '.thumbnail',
            '.thumbnail-nav'
        ];

        selectors.forEach(selector => {
            const elements = popup.querySelectorAll(selector);

            elements.forEach(element => {
                const mouseEnterHandler = () => {
                    if (element.closest('.popup-close')) {
                        this.setCursorState('popup-close-hover');
                    } else if (element.closest('.popup-image-item, .gallery-item, .multi-popup-gallery img')) {
                        this.setCursorState('popup-image-hover');
                    } else if (element.closest('.btn, .btn-view, .popup-links .btn, .btn-primary, .btn-secondary')) {
                        this.setCursorState('popup-button-hover');
                    } else if (element.closest('.tech-tag, .thumbnail, .thumbnail-nav')) {
                        this.setCursorState('popup-thumbnail-hover');
                    }
                };

                const mouseLeaveHandler = () => {
                    this.setCursorState('popup-hover');
                };

                this.addEventListener(element, 'mouseenter', mouseEnterHandler);
                this.addEventListener(element, 'mouseleave', mouseLeaveHandler);

                if (!element._cursorHoverHandlers) {
                    element._cursorHoverHandlers = [];
                }
                element._cursorHoverHandlers.push({
                    mouseEnterHandler,
                    mouseLeaveHandler
                });
            });
        });
    }

    cleanupPopupCursorEvents(popup) {
        if (!popup) return;

        const popupContent = popup.querySelector('.popup-content');
        if (!popupContent) return;

        const handlers = popup._cursorHandlers;
        if (handlers) {
            popupContent.removeEventListener('mousemove', handlers.mouseMoveHandler);
            popupContent.removeEventListener('mousedown', handlers.mouseDownHandler);
            popupContent.removeEventListener('mouseup', handlers.mouseUpHandler);
            delete popup._cursorHandlers;
        }

        const selectors = [
            '.popup-close',
            '.popup-image-item',
            '.gallery-item',
            '.multi-popup-gallery img',
            '.btn',
            '.btn-view',
            '.popup-links .btn',
            '.btn-primary',
            '.btn-secondary',
            '.tech-tag',
            '.thumbnail',
            '.thumbnail-nav'
        ];

        selectors.forEach(selector => {
            const elements = popup.querySelectorAll(selector);

            elements.forEach(element => {
                if (element._cursorHoverHandlers) {
                    element._cursorHoverHandlers.forEach(handler => {
                        element.removeEventListener('mouseenter', handler.mouseEnterHandler);
                        element.removeEventListener('mouseleave', handler.mouseLeaveHandler);
                    });
                    delete element._cursorHoverHandlers;
                }
            });
        });

        this.cursorStates.isInPopup = false;
        this.cursorStates.activeState = 'default';
        this.cursorStates.popupElement = null;

        if (this.cursorFollower) {
            this.cursorFollower.style.width = '40px';
            this.cursorFollower.style.height = '40px';
            this.cursorFollower.style.borderColor = 'var(--primary-color)';
            this.cursorFollower.style.backgroundColor = '';
            this.cursorFollower.style.backdropFilter = '';

            const stateClasses = [
                'popup-hover',
                'popup-close-hover',
                'popup-image-hover',
                'popup-button-hover',
                'popup-thumbnail-hover',
                'popup-click'
            ];

            stateClasses.forEach(cls => {
                this.cursorFollower.classList.remove(cls);
            });
        }

        popup._cursorEventsSet = false;
    }

    // ============================================
    // PORTFOLIO SYSTEM
    // ============================================

    initPortfolioSystem() {
        this.setupPortfolioInteractions();
    }

    setupPortfolioInteractions() {
        document.querySelectorAll('.category-filter').forEach(button => {
            this.addEventListener(button, 'click', (e) => this.filterPortfolio(e));
        });

        document.addEventListener('click', (e) => {
            const portfolioItem = e.target.closest('.portfolio-item');
            if (portfolioItem) {
                this.openPortfolioPopup(portfolioItem);
            }
        });

        document.querySelectorAll('.btn-view').forEach(button => {
            this.addEventListener(button, 'click', (e) => {
                e.stopPropagation();
                const popupId = button.dataset.popup;
                this.openPopup(popupId);
            });
        });
    }

    filterPortfolio(event) {
        const button = event.currentTarget;
        const filter = button.dataset.filter;

        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });

        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        this.animatePortfolioFilter(filter);
    }

    animatePortfolioFilter(filter) {
        const items = document.querySelectorAll('.portfolio-item');

        if (this.filterTimeout) clearTimeout(this.filterTimeout);

        items.forEach(item => {
            const category = item.dataset.category;

            if (filter === 'all' || filter === category) {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px) scale(0.95)';
                item.style.display = 'block';

                requestAnimationFrame(() => {
                    item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0) scale(1)';
                });
            } else {
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px) scale(0.95)';

                this.filterTimeout = setTimeout(() => {
                    if (item.parentNode) {
                        item.style.display = 'none';
                    }
                }, 300);
            }
        });
    }

    // ============================================
    // POPUP SYSTEM
    // ============================================

    openPortfolioPopup(item) {
        const popupId = item.dataset.popup;
        this.openPopup(popupId);
    }

    openPopup(popupId) {
        const popup = document.getElementById(popupId);
        if (!popup) return;

        this.lastFocusedElement = document.activeElement;

        popup.classList.add('active');
        popup.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Create 3D scene if container exists and not already created
        if (!this.isMobile && typeof THREE !== 'undefined' && !this.popup3DScenes.has(popupId)) {
            const showcase = popup.querySelector('.popup-3d-showcase');
            if (showcase) {
                const canvas = document.createElement('canvas');
                canvas.id = `${popupId}-canvas`;
                showcase.appendChild(canvas);
                this.createPopup3DScene(popupId, canvas);
            }
        }

        this.setupPopupCursorEvents(popup);

        const trapHandler = this.setupFocusTrap(popup);
        this.focusTrapHandlers.set(popup, trapHandler);

        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePopup(popupId);
                popup.removeEventListener('keydown', escapeHandler);
            }
        };

        this.addEventListener(popup, 'keydown', escapeHandler);

        const closeBtn = popup.querySelector('.popup-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.closePopup(popupId));
        }

        const overlay = popup.querySelector('.popup-overlay');
        if (overlay) {
            this.addEventListener(overlay, 'click', () => this.closePopup(popupId));
        }

        setTimeout(() => {
            const firstInteractive = popup.querySelector('button, [href], input, select, textarea');
            if (firstInteractive) firstInteractive.focus();
        }, 100);
    }

    closePopup(popupId) {
        const popup = document.getElementById(popupId);
        if (!popup) return;

        popup.classList.remove('active');
        popup.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        this.cleanupPopup3DScene(popupId);
        this.cleanupPopupCursorEvents(popup);

        const trapHandler = this.focusTrapHandlers.get(popup);
        if (trapHandler) {
            popup.removeEventListener('keydown', trapHandler);
            this.focusTrapHandlers.delete(popup);
        }

        if (this.lastFocusedElement) {
            setTimeout(() => this.lastFocusedElement.focus(), 50);
        }
    }

    setupFocusTrap(popup) {
        const focusableElements = popup.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const trapFocus = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        this.addEventListener(popup, 'keydown', trapFocus);
        return trapFocus;
    }

    createPopup3DScene(popupId, canvas) {
        if (!canvas) return;

        try {
            const isGraphicDesign = [
                'tuition-popup',
                'youtube-popup',
                'facebook-popup',
                'product-popup',
                'event-popup'
            ].includes(popupId);

            const color = isGraphicDesign ? 0xcc00ff : 0x00ccff;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true
            });

            const container = canvas.parentElement;
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            camera.position.z = 10;

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(color, 0.8);
            directionalLight.position.set(5, 5, 5);
            scene.add(directionalLight);

            const geometry = new THREE.IcosahedronGeometry(2.5, 1);
            const material = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.8,
                roughness: 0.1,
                wireframe: true,
                transparent: true,
                opacity: 0.8
            });

            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            const particleCount = this.isMobile ? 15 : 30;
            const particles = this.createPopupParticles(color, particleCount);
            scene.add(particles);

            let animationId;
            const animate = (time) => {
                animationId = requestAnimationFrame(animate);

                const t = time * 0.001;

                mesh.rotation.x = t * 0.1;
                mesh.rotation.y = t * 0.2;

                particles.rotation.y = t * 0.05;
                particles.rotation.x = t * 0.03;

                renderer.render(scene, camera);
            };

            animate();

            this.popup3DScenes.set(popupId, { scene, camera, renderer, animationId });

        } catch (error) {
            console.error('Failed to create popup 3D scene:', error);
        }
    }

    createPopupParticles(color, count) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const threeColor = new THREE.Color(color);

        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 15;
            positions[i + 1] = (Math.random() - 0.5) * 15;
            positions[i + 2] = (Math.random() - 0.5) * 15;

            colors[i] = threeColor.r;
            colors[i + 1] = threeColor.g;
            colors[i + 2] = threeColor.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.5
        });

        return new THREE.Points(geometry, material);
    }

    cleanupPopup3DScene(popupId) {
        const sceneData = this.popup3DScenes.get(popupId);
        if (!sceneData) return;

        const { scene, renderer, animationId } = sceneData;

        cancelAnimationFrame(animationId);

        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        renderer.dispose();
        this.popup3DScenes.delete(popupId);
    }

    // ============================================
    // FORM SYSTEM
    // ============================================

    initForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        this.addEventListener(form, 'submit', (e) => this.handleFormSubmit(e));

        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            this.addEventListener(input, 'blur', () => this.validateField(input));
            this.addEventListener(input, 'input', () => this.validateField(input, true));
        });
    }

    validateField(field, realtime = false) {
        let isValid = true;
        let errorMessage = '';

        if (field.required && !field.value.trim()) {
            isValid = false;
            errorMessage = 'This field is required';
        }

        if (field.type === 'email' && field.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }

        if (field.value) {
            if (field.minLength && field.value.length < field.minLength) {
                isValid = false;
                errorMessage = `Minimum ${field.minLength} characters required`;
            }

            if (field.maxLength && field.value.length > field.maxLength) {
                isValid = false;
                errorMessage = `Maximum ${field.maxLength} characters allowed`;
            }
        }

        this.updateFieldValidation(field, isValid, errorMessage);

        return isValid;
    }

    updateFieldValidation(field, isValid, errorMessage) {
        const errorElement = field.parentElement.querySelector('.error-message');

        if (errorElement) {
            errorElement.textContent = errorMessage;
            errorElement.style.opacity = errorMessage ? '1' : '0';
        }

        field.setAttribute('aria-invalid', !isValid);

        if (isValid) {
            field.classList.remove('invalid');
            field.classList.add('valid');
        } else {
            field.classList.remove('valid');
            field.classList.add('invalid');
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        if (data.website) {
            console.log('Spam detected via honeypot');
            this.showFormMessage('Submission blocked.', 'error');
            return;
        }

        let isValid = true;
        const inputs = form.querySelectorAll('input, textarea');

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.showFormMessage('Please fix the errors above.', 'error');
            return;
        }

        this.showFormMessage('Sending your message...', 'loading');

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            this.showFormMessage('Message sent successfully! I\'ll get back to you soon.', 'success');
            form.reset();

            inputs.forEach(input => {
                input.classList.remove('valid', 'invalid');
                input.removeAttribute('aria-invalid');
            });

        } catch (error) {
            console.error('Form submission error:', error);
            this.showFormMessage('Failed to send message. Please try again.', 'error');
        }
    }

    showFormMessage(message, type) {
        const existing = document.querySelector('.form-status');
        if (existing) existing.remove();

        const messageElement = document.createElement('div');
        messageElement.className = `form-status ${type}`;
        messageElement.textContent = message;
        messageElement.setAttribute('role', 'alert');
        messageElement.setAttribute('aria-live', 'polite');

        const form = document.getElementById('contact-form');
        const submitButton = form.querySelector('button[type="submit"]');

        form.insertBefore(messageElement, submitButton.nextSibling);

        if (type !== 'success') {
            setTimeout(() => {
                if (messageElement.parentElement) {
                    messageElement.remove();
                }
            }, 5000);
        }
    }

    // ============================================
    // ANIMATION SYSTEM
    // ============================================

    initScrollAnimations() {
        if ('IntersectionObserver' in window) {
            this.initScrollObserver();
        }
    }

    initScrollObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');

                    if (entry.target.id) {
                        this.currentSection = entry.target.id;
                        this.updateNavigation();
                        this.updateBodyBackground();   // <-- UNCOMMENTED NOW
                    }

                    this.triggerSectionAnimations(entry.target);
                }
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('section').forEach(section => {
            observer.observe(section);
        });
    }

    triggerSectionAnimations(section) {
        switch (section.id) {
            case 'about':
                this.animateAboutSection();
                break;
            case 'skills':
                this.animateSkillsEntrance();
                break;
            case 'portfolio':
                this.animatePortfolioSection();
                break;
        }
    }

    animateAboutSection() {
        const stats = document.querySelectorAll('.stat-item');
        stats.forEach((stat, index) => {
            stat.style.opacity = '0';
            stat.style.transform = 'translateY(20px)';

            setTimeout(() => {
                stat.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                stat.style.opacity = '1';
                stat.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    animatePortfolioSection() {
        const grid = document.querySelector('.portfolio-grid');
        if (grid) {
            grid.classList.add('visible');
        }
    }

    startAnimationLoop() {
        const animate = (time) => {
            this.animationFrame = requestAnimationFrame(animate);
            this.updatePerformance(time);
            this.updateScrollAnimation();
            this.updateCursor();
        };

        animate();
    }

    updatePerformance(time) {
        if (!this.performance) return;

        const now = performance.now();

        if (this.performance.lastFrameTime) {
            const delta = now - this.performance.lastFrameTime;

            if (now - this.performance.lastFPSUpdate > 1000) {
                this.performance.fps = Math.round(1000 / delta);
                this.performance.lastFPSUpdate = now;

                if (this.performance.fps < 30 && !this.isMobile) {
                    console.warn(`Low FPS: ${this.performance.fps}`);
                }
            }
        }

        this.performance.lastFrameTime = now;
    }

    updateScrollAnimation() {
        this.scrollAnimation.current += (this.scrollAnimation.target - this.scrollAnimation.current) * this.scrollAnimation.ease;
    }

    // ============================================
    // NAVIGATION
    // ============================================

    updateNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');

            if (link.getAttribute('href') === `#${this.currentSection}`) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    toggleMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        const menuToggle = document.getElementById('menu-toggle');

        if (navMenu.classList.contains('active')) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        const menuToggle = document.getElementById('menu-toggle');

        navMenu.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.classList.add('active');

        const lines = menuToggle.querySelectorAll('.menu-line');
        lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        lines[1].style.opacity = '0';
        lines[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';

        this.setupMobileMenuFocusTrap();
    }

    closeMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        const menuToggle = document.getElementById('menu-toggle');

        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.classList.remove('active');

        const lines = menuToggle.querySelectorAll('.menu-line');
        lines.forEach(line => {
            line.style.transform = '';
            line.style.opacity = '';
        });
    }

    setupMobileMenuFocusTrap() {
        const navMenu = document.querySelector('.nav-menu');
        const menuItems = navMenu.querySelectorAll('.nav-link');

        if (menuItems.length === 0) return;

        const firstItem = menuItems[0];
        const lastItem = menuItems[menuItems.length - 1];

        firstItem.focus();

        const trapFocus = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstItem) {
                    e.preventDefault();
                    lastItem.focus();
                }
            } else {
                if (document.activeElement === lastItem) {
                    e.preventDefault();
                    firstItem.focus();
                }
            }
        };

        this.addEventListener(navMenu, 'keydown', trapFocus);
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    setupEventListeners() {
        this.addEventListener(window, 'load', () => this.onWindowLoad());
        this.addEventListener(window, 'resize', () => this.debounce(() => this.onWindowResize(), 250));
        this.addEventListener(window, 'scroll', () => this.throttle(() => this.onWindowScroll(), 16));
        this.addEventListener(window, 'mousemove', (e) => this.onMouseMove(e));

        this.addEventListener(document, 'visibilitychange', () => this.onVisibilityChange());

        this.addEventListener(document, 'click', () => {
            if (!this.hasUserInteracted) {
                this.hasUserInteracted = true;
            }
        }, { once: true });

        document.querySelectorAll('.nav-link').forEach(link => {
            this.addEventListener(link, 'click', (e) => this.onNavClick(e));
        });

        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            this.addEventListener(menuToggle, 'click', () => this.toggleMobileMenu());
        }

        const socialToggle = document.getElementById('social-toggle');
        if (socialToggle) {
            this.addEventListener(socialToggle, 'click', () => this.toggleSocialPanel());
        }

        const categoryToggle = document.getElementById('category-toggle');
        if (categoryToggle) {
            this.addEventListener(categoryToggle, 'click', () => this.openCategoriesPopup());
        }

        document.querySelectorAll('.magnetic-btn').forEach(btn => {
            this.addEventListener(btn, 'mousemove', (e) => this.onMagneticButtonMove(e, btn));
            this.addEventListener(btn, 'mouseleave', () => this.onMagneticButtonLeave(btn));
        });

        this.addEventListener(document, 'keydown', (e) => this.onKeyDown(e));
    }

    addEventListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this.eventListeners.push({ target, event, handler, options });
    }

    onWindowLoad() {
        console.log('✅ Window loaded');
        this.updateCurrentYear();

        if (!this.skillsInitialized) {
            this.initSkillsSection();
        }
    }

    onWindowResize() {
        this.isMobile = window.innerWidth < 768;
        this.isTablet = window.innerWidth < 992;

        // Hero scene resize
        if (this.heroScene) {
            const canvas = document.getElementById('home-canvas');
            if (canvas) {
                const container = canvas.parentElement;
                this.heroScene.camera.aspect = container.clientWidth / container.clientHeight;
                this.heroScene.camera.updateProjectionMatrix();
                this.heroScene.renderer.setSize(container.clientWidth, container.clientHeight);
            }
        }

        // Section scenes resize
        this.active3DScenes.forEach((sceneData, sectionId) => {
            const canvas = document.getElementById(`${sectionId}-canvas`);
            if (canvas && canvas.parentElement) {
                const container = canvas.parentElement;
                sceneData.camera.aspect = container.clientWidth / container.clientHeight;
                sceneData.camera.updateProjectionMatrix();
                sceneData.renderer.setSize(container.clientWidth, container.clientHeight);
            }
        });

        // Popup scenes resize
        this.popup3DScenes.forEach((sceneData, popupId) => {
            const canvas = document.getElementById(`${popupId}-canvas`);
            if (canvas && canvas.parentElement) {
                const container = canvas.parentElement;
                sceneData.camera.aspect = container.clientWidth / container.clientHeight;
                sceneData.camera.updateProjectionMatrix();
                sceneData.renderer.setSize(container.clientWidth, container.clientHeight);
            }
        });
    }

    onWindowScroll() {
        this.scrollAnimation.target = window.pageYOffset;

        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            if (window.pageYOffset > 100) {
                scrollIndicator.style.opacity = '0';
                scrollIndicator.style.visibility = 'hidden';
            } else {
                scrollIndicator.style.opacity = '1';
                scrollIndicator.style.visibility = 'visible';
            }
        }
    }

    onMouseMove(e) {
        if (this.isMobile) return;

        this.cursor.x = e.clientX;
        this.cursor.y = e.clientY;
    }

    onVisibilityChange() {
        if (document.hidden) {
            this.pauseAnimations();
        } else {
            this.resumeAnimations();
        }
    }

    onNavClick(e) {
        e.preventDefault();

        const href = e.currentTarget.getAttribute('href');
        if (!href) return;

        const targetId = href.substring(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            });

            e.currentTarget.classList.add('active');
            e.currentTarget.setAttribute('aria-current', 'page');

            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            history.pushState(null, null, `#${targetId}`);
            this.closeMobileMenu();
        }
    }

    onKeyDown(e) {
        if (e.key === 'Escape') {
            const activePopup = document.querySelector('.portfolio-popup.active');
            if (activePopup) {
                const popupId = activePopup.id;
                this.closePopup(popupId);
            }
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateWithKeyboard(e.key);
        }
    }

    navigateWithKeyboard(direction) {
        const sections = Array.from(document.querySelectorAll('section[id]'));
        const currentIndex = sections.findIndex(s => s.id === this.currentSection);

        let nextIndex;
        if (direction === 'ArrowDown') {
            nextIndex = Math.min(currentIndex + 1, sections.length - 1);
        } else {
            nextIndex = Math.max(currentIndex - 1, 0);
        }

        if (nextIndex !== currentIndex) {
            sections[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    onMagneticButtonMove(e, button) {
        if (this.isMobile) return;

        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        button.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    }

    onMagneticButtonLeave(button) {
        button.style.transform = 'translate(0, 0)';
    }

    toggleSocialPanel() {
        const socialPanel = document.querySelector('.social-panel');
        const toggleButton = document.getElementById('social-toggle');

        socialPanel.classList.toggle('active');
        toggleButton.setAttribute('aria-expanded', socialPanel.classList.contains('active'));
    }

    openCategoriesPopup() {
        this.openPopup('categories-popup');
    }

    // ============================================
    // UTILITIES
    // ============================================

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    updateCurrentYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    pauseAnimations() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.heroScene && this.heroScene.animationId) {
            cancelAnimationFrame(this.heroScene.animationId);
            this.heroScene.animationId = null;
        }

        this.active3DScenes.forEach(sceneData => {
            if (sceneData.animationId) {
                cancelAnimationFrame(sceneData.animationId);
                sceneData.animationId = null;
            }
        });

        this.popup3DScenes.forEach(sceneData => {
            if (sceneData.animationId) {
                cancelAnimationFrame(sceneData.animationId);
                sceneData.animationId = null;
            }
        });
    }

    resumeAnimations() {
        if (!this.animationFrame) {
            this.startAnimationLoop();
        }

        if (this.heroScene && !this.heroScene.animationId) {
            this.animateHeroScene();
        }

        this.active3DScenes.forEach((sceneData, sectionId) => {
            if (!sceneData.animationId) {
                this.animateSectionScene(sectionId);
            }
        });
    }

    updateBodyBackground() {
        document.body.setAttribute('data-section', this.currentSection);
    }

    showErrorUI(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'app-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(10, 10, 15, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 2rem;
            text-align: center;
            color: white;
        `;

        errorDiv.innerHTML = `
            <h3 style="color: #ff4444; margin-bottom: 1rem;">Something went wrong</h3>
            <p style="margin-bottom: 2rem; max-width: 500px;">
                The application failed to load properly. Please refresh the page.
            </p>
            <p style="font-size: 0.9rem; color: #b0b0c0; margin-bottom: 2rem;">
                Error: ${error.message}
            </p>
            <button onclick="location.reload()" class="btn btn-primary">
                Reload Page
            </button>
        `;

        document.body.appendChild(errorDiv);
    }

    // ============================================
    // CLEANUP
    // ============================================

    destroy() {
        this.pauseAnimations();

        // Clean up hero scene
        if (this.heroScene) {
            this.heroScene.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.heroScene.renderer.dispose();
        }

        // Clean up section scenes
        this.active3DScenes.forEach((sceneData) => {
            cancelAnimationFrame(sceneData.animationId);
            sceneData.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            sceneData.renderer.dispose();
        });
        this.active3DScenes.clear();

        // Clean up popup scenes
        this.popup3DScenes.forEach((sceneData) => {
            cancelAnimationFrame(sceneData.animationId);
            sceneData.scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            sceneData.renderer.dispose();
        });
        this.popup3DScenes.clear();

        this.eventListeners.forEach(({ target, event, handler, options }) => {
            target.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];

        document.body.style.cursor = '';

        console.log('🎯 Application destroyed');
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        document.documentElement.style.setProperty('--transition-slow', '0.01s');
        document.documentElement.style.setProperty('--transition-medium', '0.01s');
        document.documentElement.style.setProperty('--transition-fast', '0.01s');

        const style = document.createElement('style');
        style.textContent = `
            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        document.head.appendChild(style);
    }

    try {
        window.portfolioApp = new PortfolioApp();
    } catch (error) {
        console.error('Failed to initialize application:', error);

        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #0a0a0f;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
            z-index: 9999;
        `;

        errorDiv.innerHTML = `
            <h1 style="color: #cc00ff; margin-bottom: 1rem;">Isuru Lakshan</h1>
            <p style="margin-bottom: 2rem; max-width: 500px;">
                Professional Graphic Designer & Video Editor
            </p>
            <p style="margin-bottom: 2rem;">
                The interactive features failed to load. Please refresh or try again later.
            </p>
            <button onclick="location.reload()" style="
                background: linear-gradient(135deg, #cc00ff, #00ccff);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
            ">
                Reload Page
            </button>
        `;

        document.body.appendChild(errorDiv);
    }
});

if (typeof window !== 'undefined') {
    window.debugApp = () => window.portfolioApp;
}
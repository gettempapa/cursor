export class UI {
    constructor(container) {
        this.container = container;
        this.setupUI();
    }
    
    setupUI() {
        this.setupHUD();
        this.setupWeaponMenu();
        this.setupCrosshair();
        this.setupVisualFeedback();
    }
    
    setupHUD() {
        // Create HUD container
        this.hudContainer = document.createElement('div');
        this.hudContainer.style.position = 'absolute';
        this.hudContainer.style.bottom = '20px';
        this.hudContainer.style.left = '20px';
        this.hudContainer.style.color = 'white';
        this.hudContainer.style.fontFamily = 'Arial, sans-serif';
        this.hudContainer.style.fontSize = '18px';
        this.hudContainer.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
        
        // Create health display
        this.healthDisplay = document.createElement('div');
        this.healthDisplay.style.marginBottom = '10px';
        this.hudContainer.appendChild(this.healthDisplay);
        
        // Create ammo display
        this.ammoDisplay = document.createElement('div');
        this.hudContainer.appendChild(this.ammoDisplay);
        
        // Create enemy health bar
        this.setupEnemyHealthBar();
        
        this.container.appendChild(this.hudContainer);
    }
    
    setupEnemyHealthBar() {
        this.enemyHealthBar = document.createElement('div');
        this.enemyHealthBar.style.position = 'absolute';
        this.enemyHealthBar.style.top = '20px';
        this.enemyHealthBar.style.left = '50%';
        this.enemyHealthBar.style.transform = 'translateX(-50%)';
        this.enemyHealthBar.style.width = '200px';
        this.enemyHealthBar.style.height = '20px';
        this.enemyHealthBar.style.backgroundColor = 'rgba(0,0,0,0.5)';
        this.enemyHealthBar.style.border = '2px solid white';
        this.enemyHealthBar.style.display = 'none';
        
        this.enemyHealthFill = document.createElement('div');
        this.enemyHealthFill.style.width = '100%';
        this.enemyHealthFill.style.height = '100%';
        this.enemyHealthFill.style.backgroundColor = 'red';
        this.enemyHealthFill.style.transition = 'width 0.3s ease-in-out';
        this.enemyHealthBar.appendChild(this.enemyHealthFill);
        
        this.container.appendChild(this.enemyHealthBar);
    }
    
    setupWeaponMenu() {
        this.weaponMenuContainer = document.createElement('div');
        this.weaponMenuContainer.style.position = 'absolute';
        this.weaponMenuContainer.style.top = '50%';
        this.weaponMenuContainer.style.left = '50%';
        this.weaponMenuContainer.style.transform = 'translate(-50%, -50%)';
        this.weaponMenuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.weaponMenuContainer.style.padding = '20px';
        this.weaponMenuContainer.style.borderRadius = '10px';
        this.weaponMenuContainer.style.display = 'none';
        this.weaponMenuContainer.style.color = 'white';
        this.weaponMenuContainer.style.fontFamily = 'Arial, sans-serif';
        this.weaponMenuContainer.style.fontSize = '24px';
        this.weaponMenuContainer.style.textAlign = 'left';
        this.weaponMenuContainer.style.minWidth = '200px';
        
        this.weaponMenuContainer.innerHTML = `
            <div style="margin-bottom: 20px; color: #ff0; text-align: center;">WEAPON SELECT</div>
            <div style="margin: 10px 0;">1. Rifle</div>
            <div style="margin: 10px 0;">2. Pistol</div>
        `;
        
        this.container.appendChild(this.weaponMenuContainer);
    }
    
    setupCrosshair() {
        const crosshairContainer = document.createElement('div');
        crosshairContainer.style.position = 'absolute';
        crosshairContainer.style.top = '45%';
        crosshairContainer.style.left = '52%';
        crosshairContainer.style.transform = 'translate(-50%, -50%)';
        crosshairContainer.style.width = '20px';
        crosshairContainer.style.height = '20px';
        crosshairContainer.style.pointerEvents = 'none';
        
        const crosshair = document.createElement('div');
        crosshair.style.width = '100%';
        crosshair.style.height = '100%';
        crosshair.style.position = 'relative';
        
        // Add circle
        const circle = document.createElement('div');
        circle.style.position = 'absolute';
        circle.style.width = '100%';
        circle.style.height = '100%';
        circle.style.border = '1.5px solid rgba(255, 255, 255, 0.8)';
        circle.style.borderRadius = '50%';
        crosshair.appendChild(circle);
        
        // Add crosshair lines
        const createLine = (vertical) => {
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            
            if (vertical) {
                line.style.width = '1.5px';
                line.style.height = '100%';
                line.style.left = '50%';
                line.style.transform = 'translateX(-50%)';
            } else {
                line.style.height = '1.5px';
                line.style.width = '100%';
                line.style.top = '50%';
                line.style.transform = 'translateY(-50%)';
            }
            
            return line;
        };
        
        crosshair.appendChild(createLine(true));
        crosshair.appendChild(createLine(false));
        
        crosshairContainer.appendChild(crosshair);
        this.container.appendChild(crosshairContainer);
    }
    
    setupVisualFeedback() {
        // Damage overlay
        this.damageOverlay = document.createElement('div');
        this.damageOverlay.style.position = 'absolute';
        this.damageOverlay.style.top = '0';
        this.damageOverlay.style.left = '0';
        this.damageOverlay.style.width = '100%';
        this.damageOverlay.style.height = '100%';
        this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        this.damageOverlay.style.pointerEvents = 'none';
        this.damageOverlay.style.transition = 'background-color 0.1s ease-in-out';
        this.container.appendChild(this.damageOverlay);
        
        // Reload indicator
        this.reloadIndicator = document.createElement('div');
        this.reloadIndicator.style.position = 'absolute';
        this.reloadIndicator.style.top = '50%';
        this.reloadIndicator.style.left = '50%';
        this.reloadIndicator.style.transform = 'translate(-50%, -50%)';
        this.reloadIndicator.style.color = 'white';
        this.reloadIndicator.style.fontSize = '24px';
        this.reloadIndicator.style.fontFamily = 'Arial, sans-serif';
        this.reloadIndicator.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
        this.reloadIndicator.style.display = 'none';
        this.reloadIndicator.textContent = 'RELOADING';
        this.container.appendChild(this.reloadIndicator);
        
        // Low ammo warning
        this.lowAmmoWarning = document.createElement('div');
        this.lowAmmoWarning.style.position = 'absolute';
        this.lowAmmoWarning.style.bottom = '60px';
        this.lowAmmoWarning.style.left = '20px';
        this.lowAmmoWarning.style.color = 'red';
        this.lowAmmoWarning.style.fontSize = '18px';
        this.lowAmmoWarning.style.fontFamily = 'Arial, sans-serif';
        this.lowAmmoWarning.style.textShadow = '2px 2px 2px rgba(0,0,0,0.5)';
        this.lowAmmoWarning.style.display = 'none';
        this.lowAmmoWarning.textContent = 'LOW AMMO!';
        this.container.appendChild(this.lowAmmoWarning);
        
        // Death message
        this.deathMessageContainer = document.createElement('div');
        this.deathMessageContainer.style.position = 'absolute';
        this.deathMessageContainer.style.top = '50%';
        this.deathMessageContainer.style.left = '50%';
        this.deathMessageContainer.style.transform = 'translate(-50%, -50%)';
        this.deathMessageContainer.style.color = 'red';
        this.deathMessageContainer.style.fontSize = '48px';
        this.deathMessageContainer.style.fontWeight = 'bold';
        this.deathMessageContainer.style.textShadow = '2px 2px 4px black';
        this.deathMessageContainer.style.fontFamily = 'Arial, sans-serif';
        this.deathMessageContainer.style.display = 'none';
        this.deathMessageContainer.textContent = 'YOU DIED';
        this.container.appendChild(this.deathMessageContainer);
    }
    
    updateHUD(playerHealth, ammo, currentWeapon) {
        // Update health display with color
        const healthColor = playerHealth > 70 ? 'white' :
                          playerHealth > 30 ? 'yellow' : 'red';
        this.healthDisplay.style.color = healthColor;
        this.healthDisplay.innerHTML = `❤️ Health: ${playerHealth}`;
        
        // Update ammo display
        this.ammoDisplay.innerHTML = `🎯 Ammo: ${ammo.current}/${ammo.reserve}`;
        
        // Show/hide low ammo warning
        const lowAmmoThreshold = currentWeapon === 'rifle' ? 10 : 4;
        this.lowAmmoWarning.style.display = 
            ammo.current <= lowAmmoThreshold ? 'block' : 'none';
    }
    
    updateEnemyHealthBar(enemyHealth, maxHealth, distanceToPlayer) {
        if (distanceToPlayer < 15) {
            this.enemyHealthBar.style.display = 'block';
            this.enemyHealthFill.style.width = `${(enemyHealth / maxHealth) * 100}%`;
            
            const healthPercent = enemyHealth / maxHealth;
            const r = Math.floor(255 * (1 - healthPercent));
            const g = Math.floor(255 * healthPercent);
            this.enemyHealthFill.style.backgroundColor = `rgb(${r}, ${g}, 0)`;
        } else {
            this.enemyHealthBar.style.display = 'none';
        }
    }
    
    showDamageEffect() {
        this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
            this.damageOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        }, 100);
    }
    
    toggleWeaponMenu(show) {
        this.weaponMenuContainer.style.display = show ? 'block' : 'none';
    }
    
    showDeathMessage() {
        this.deathMessageContainer.style.display = 'block';
    }
    
    hideDeathMessage() {
        this.deathMessageContainer.style.display = 'none';
    }
    
    showReloadIndicator() {
        this.reloadIndicator.style.display = 'block';
    }
    
    hideReloadIndicator() {
        this.reloadIndicator.style.display = 'none';
    }
} 
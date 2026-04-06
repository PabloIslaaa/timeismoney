document.addEventListener("DOMContentLoaded", () => {
    const configInputs = document.querySelectorAll(".config-panel input");
    const priceInput = document.getElementById("priceInput");
    const resultsContainer = document.querySelector(".results-container");
    const saveConfigBtn = document.getElementById("saveConfigBtn");
    const costPanel = document.getElementById("costPanel");
    const dobInput = document.getElementById('dob');
    const matrixContainer = document.getElementById('lifeMatrix');
    const showCostToggle = document.getElementById('showCostToggle');

    const dobFreeInput = document.getElementById('dobFree');
    const sleepHoursInput = document.getElementById('sleepHours');
    const sleepMinutesInput = document.getElementById('sleepMinutes');
    const eatMinutesInput = document.getElementById('eatMinutes');
    const dineMinutesInput = document.getElementById('dineMinutes');
    const workHoursFreeInput = document.getElementById('workHoursFree');
    const workMinutesFreeInput = document.getElementById('workMinutesFree');
    const freeTimeTotalOutput = document.getElementById('free-time-total');

    let isConfigSaved = false;
    let currentSavingsLifeWeeks = 0;
    let matrixDotsCache = [];
    let freeTimeInterval = null;

    // Load config from localStorage
    function loadConfig() {
        if(localStorage.getItem('grossSalary')) document.getElementById('grossSalary').value = localStorage.getItem('grossSalary');
        if(localStorage.getItem('netSalary')) document.getElementById('netSalary').value = localStorage.getItem('netSalary');
        if(localStorage.getItem('workHours')) document.getElementById('workHours').value = localStorage.getItem('workHours');
        if(localStorage.getItem('savings')) document.getElementById('savings').value = localStorage.getItem('savings');
        if(localStorage.getItem('dob')) {
            const savedDob = localStorage.getItem('dob');
            dobInput.value = savedDob;
            if(dobFreeInput) dobFreeInput.value = savedDob;
        }
        
        // Sync free time work hours
        if(localStorage.getItem('workHours')) {
            if(workHoursFreeInput) workHoursFreeInput.value = localStorage.getItem('workHours');
        }

        // Load other free time inputs (with two-digit padding for minutes)
        if(localStorage.getItem('sleepHours') && sleepHoursInput) sleepHoursInput.value = localStorage.getItem('sleepHours');
        if(localStorage.getItem('sleepMinutes') && sleepMinutesInput) {
            const sm = parseInt(localStorage.getItem('sleepMinutes'), 10);
            sleepMinutesInput.value = isNaN(sm) ? '00' : String(sm).padStart(2, '0');
        }
        if(localStorage.getItem('eatMinutes') && eatMinutesInput) eatMinutesInput.value = localStorage.getItem('eatMinutes');
        if(localStorage.getItem('dineMinutes') && dineMinutesInput) dineMinutesInput.value = localStorage.getItem('dineMinutes');
        if(localStorage.getItem('workMinutesFree') && workMinutesFreeInput) {
            const wm = parseInt(localStorage.getItem('workMinutesFree'), 10);
            workMinutesFreeInput.value = isNaN(wm) ? '00' : String(wm).padStart(2, '0');
        }

        if(localStorage.getItem('configSaved') === 'true') {
            setTimeout(() => saveConfigBtn.click(), 10);
        }
        
        // Start the countdown interval
        if (freeTimeInterval) clearInterval(freeTimeInterval);
        freeTimeInterval = setInterval(calculateFreeTime, 1000);
        calculateFreeTime();
    }
    loadConfig();

    const configMap = [
        { key: "gross", salaryId: "grossSalary" },
        { key: "net", salaryId: "netSalary" },
        { key: "savings", salaryId: "savings" }
    ];

    // Number formatters for Spanish locale (1.000,50)
    function formatSpanishNumber(value) {
        if(!value) return "";
        let raw = value.toString().replace(/[^\d,]/g, '');
        let parts = raw.split(',');
        let integerPart = parts[0];
        let decimalPart = parts.length > 1 ? ',' + parts[1] : ''; 
        
        if (integerPart) {
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }
        return integerPart + decimalPart;
    }

    function parseSpanishNumber(value) {
        if(!value) return 0;
        let normalized = value.toString().replace(/\./g, '').replace(',', '.');
        return parseFloat(normalized) || 0;
    }

    // Attach formatters
    const allInputs = document.querySelectorAll('input[type="text"]');
    allInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Store cursor pos if possible to prevent jumping, though simple replace is ok for now
            this.value = formatSpanishNumber(this.value);
            
            if (this.id === 'priceInput' && isConfigSaved) {
                calculate();
            }
            
            // Sync work hours to free time section (Hours only, minutes stay separate)
            if (this.id === 'workHours' && workHoursFreeInput) {
                workHoursFreeInput.value = this.value;
                localStorage.setItem('workHours', this.value);
                calculateFreeTime();
            }
            
            // Re-calculate and save free time if any of its inputs change
            const freeTimeInputIds = ['sleepHours', 'sleepMinutes', 'eatMinutes', 'dineMinutes', 'workHoursFree', 'workMinutesFree'];
            if (freeTimeInputIds.includes(this.id)) {
                localStorage.setItem(this.id, this.value);
                calculateFreeTime();
            }
        });

        input.addEventListener('focus', function() {
            if(this.value === "0" || this.value === "00") this.value = "";
        });

        input.addEventListener('blur', function() {
            if(this.value === "") {
                this.value = this.classList.contains('two-digit-input') ? "00" : "0";
            }
        });
    });

    // Two-digit auto-pad on blur for minute inputs
    document.querySelectorAll('.two-digit-input').forEach(input => {
        input.addEventListener('blur', function() {
            const raw = parseInt(this.value, 10);
            if (!isNaN(raw)) {
                this.value = String(raw).padStart(2, '0');
            } else {
                this.value = '00';
            }
            // Persist
            localStorage.setItem(this.id, this.value);
            calculateFreeTime();
        });
    });

    saveConfigBtn.addEventListener("click", () => {
        if (!isConfigSaved) {
            // Activar (Guardar variables)
            isConfigSaved = true;
            configInputs.forEach(input => {
                input.disabled = true;
                input.classList.add("input-locked");
            });
            
            // Persist to local storage
            localStorage.setItem('grossSalary', document.getElementById('grossSalary').value);
            localStorage.setItem('netSalary', document.getElementById('netSalary').value);
            localStorage.setItem('workHours', document.getElementById('workHours').value);
            localStorage.setItem('savings', document.getElementById('savings').value);
            localStorage.setItem('configSaved', 'true');

            priceInput.disabled = false;
            costPanel.classList.remove("disabled-panel");
            
            saveConfigBtn.textContent = "Editar Entorno Vital";
            saveConfigBtn.classList.add("edit-mode");
            
            if(parseSpanishNumber(priceInput.value) > 0) {
                calculate();
            } else {
                priceInput.focus();
            }
        } else {
            // Desbloquear (Editar)
            isConfigSaved = false;
            configInputs.forEach(input => {
                input.disabled = false;
                input.classList.remove("input-locked");
            });
            priceInput.disabled = true;
            costPanel.classList.add("disabled-panel");
            resultsContainer.classList.remove("active");
            
            localStorage.setItem('configSaved', 'false');

            saveConfigBtn.textContent = "Guardar Entorno Vital";
            saveConfigBtn.classList.remove("edit-mode");
        }
    });

    function calculate() {
        if(!isConfigSaved) return;

        const workHours = parseSpanishNumber(document.getElementById("workHours").value);
        const price = parseSpanishNumber(priceInput.value);

        const implicitWorkDaysPerYear = 260; 
        const toggleWrapper = document.getElementById("toggleWrapper");

        if (price > 0) {
            resultsContainer.classList.add("active");
            if (toggleWrapper) toggleWrapper.style.display = 'flex';
        } else {
            resultsContainer.classList.remove("active");
            if (toggleWrapper) toggleWrapper.style.display = 'none';
            resetOutputs();
            return;
        }

        if (workHours === 0) {
            resetOutputs();
            return;
        }

        const hoursPerYear = workHours * implicitWorkDaysPerYear;

        configMap.forEach(cfg => {
            const annualAmount = parseSpanishNumber(document.getElementById(cfg.salaryId).value);
            const hourlyRate = annualAmount / hoursPerYear;

            // Ratio of Life to Work mathematically considering weekends.
            const totalLifeHoursPerYear = 365 * 24;
            const ratioWorkToLife = totalLifeHoursPerYear / hoursPerYear;

            const workHoursRequired = (hourlyRate > 0) ? price / hourlyRate : 0;
            const lifeHoursRequired = workHoursRequired * ratioWorkToLife;

            if (cfg.key === 'savings') {
                currentSavingsLifeWeeks = Math.ceil(lifeHoursRequired / 168); // 168 hours in a week
            }

            const workString = formatTime(workHoursRequired, workHours, implicitWorkDaysPerYear);
            const lifeString = formatTime(lifeHoursRequired, 24, 365);

            document.getElementById(`work-${cfg.key}`).innerHTML = workString;
            document.getElementById(`life-${cfg.key}`).innerHTML = lifeString;
        });

        requestAnimationFrame(shrinkTextFit);
        updateMatrix();
    }

    function shrinkTextFit() {
        // Auto scale down any time-display that overflows its container
        const displays = document.querySelectorAll('.time-display');
        displays.forEach(el => {
            const baseSize = window.getComputedStyle(el).getPropertyValue('--base-font-size-val') || '2.2';
            el.style.fontSize = baseSize + 'rem'; 
            let currentSize = parseFloat(baseSize);
            while (el.scrollWidth > el.clientWidth && currentSize > 0.8) {
                currentSize -= 0.1;
                el.style.fontSize = currentSize + 'rem';
            }
        });

        // Price input scale
        const pin = document.getElementById("priceInput");
        if (!pin) return;
        
        const basePriceSize = window.getComputedStyle(pin).getPropertyValue('--price-font-size-val') || '4.0';
        pin.style.fontSize = basePriceSize + 'rem';
        let inSize = parseFloat(basePriceSize);

        while(pin.scrollWidth > pin.clientWidth && inSize > 1) {
            inSize -= 0.2;
            pin.style.fontSize = inSize + 'rem';
        }
    }

    window.addEventListener('resize', shrinkTextFit);

    function formatTime(hours, hoursPerDay, daysPerYear) {
        if (!hours || isNaN(hours) || !isFinite(hours) || hours <= 0) return "--";

        let totalSeconds = Math.round(hours * 3600);
        let remainingSeconds = totalSeconds;

        const secondsPerYear = daysPerYear * hoursPerDay * 3600;
        const secondsPerDay = hoursPerDay * 3600;

        const y = Math.floor(remainingSeconds / secondsPerYear);
        remainingSeconds %= secondsPerYear;

        const d = Math.floor(remainingSeconds / secondsPerDay);
        remainingSeconds %= secondsPerDay;

        const h = Math.floor(remainingSeconds / 3600);
        remainingSeconds %= 3600;

        const m = Math.floor(remainingSeconds / 60);
        const s = remainingSeconds % 60;

        let parts = [];
        if (y > 0) parts.push(`<strong>${y}</strong>a`);
        if (d > 0) parts.push(`<strong>${d}</strong>d`);
        if (h > 0) parts.push(`<strong>${h}</strong>h`);
        if (m > 0 || y === 0) parts.push(`<strong>${m}</strong>m`);
        
        if (y === 0 && d === 0 && h === 0) {
            parts.push(`<strong>${s}</strong>s`);
        } else if (y === 0 && d === 0) {
            parts.push(`<strong>${s}</strong>s`);
        }

        return parts.join(' ');
    }

    function resetOutputs() {
        configMap.forEach(cfg => {
            document.getElementById(`work-${cfg.key}`).innerHTML = "--";
            document.getElementById(`life-${cfg.key}`).innerHTML = "--";
        });
        currentSavingsLifeWeeks = 0;
        const toggleWrapper = document.getElementById("toggleWrapper");
        if (toggleWrapper) toggleWrapper.style.display = 'none';
        updateMatrix();
    }

    resetOutputs();

    // --- Free Time Calculator Logic ---
    function calculateFreeTime() {
        // Find both DOB inputs
        const currentDobValue = dobInput.value || (dobFreeInput ? dobFreeInput.value : '');
        if (!currentDobValue || !freeTimeTotalOutput) return;
        
        const dob = new Date(currentDobValue);
        const now = new Date();
        
        // 85th birthday
        const endOfLife = new Date(dob);
        endOfLife.setFullYear(dob.getFullYear() + 85);
        
        if (now >= endOfLife) {
            freeTimeTotalOutput.innerHTML = "¡Tiempo libre agotado!";
            if(freeTimeInterval) clearInterval(freeTimeInterval);
            return;
        }
        
        const msLeft = endOfLife - now;
        const totalHoursLeftInLife = msLeft / (1000 * 60 * 60);
        
        // Daily deductions
        const sleepH = parseSpanishNumber(sleepHoursInput.value);
        const sleepM = parseSpanishNumber(sleepMinutesInput.value) / 60;
        const sleepTotal = sleepH + sleepM;

        const eat = parseSpanishNumber(eatMinutesInput.value) / 60;
        const dine = parseSpanishNumber(dineMinutesInput.value) / 60;
        
        const workH = parseSpanishNumber(workHoursFreeInput.value);
        const workM = parseSpanishNumber(workMinutesFreeInput.value) / 60;
        const workTotal = workH + workM;
        
        // Average daily work considering 260 working days a year
        const avgDailyWork = workTotal * (260 / 365);
        
        const dailyBurdenHours = sleepTotal + eat + dine + avgDailyWork;
        const dailyFreeHours = Math.max(0, 24 - dailyBurdenHours);
        
        // Free time ratio: dailyFreeHours / 24
        const freeTimeRatio = dailyFreeHours / 24;
        
        const totalFreeHoursLeft = totalHoursLeftInLife * freeTimeRatio;
        const freeTimeString = formatTime(totalFreeHoursLeft, 24, 365);
        freeTimeTotalOutput.innerHTML = freeTimeString;
        
        // Handle text scaling
        requestAnimationFrame(() => {
            if(freeTimeTotalOutput.scrollWidth > freeTimeTotalOutput.clientWidth) {
               freeTimeTotalOutput.style.fontSize = '1.6rem';
               freeTimeTotalOutput.style.whiteSpace = 'normal';
               freeTimeTotalOutput.style.wordBreak = 'break-word';
            }
        });
    }

    // --- Life Matrix Visualizer Logic ---

    function drawMatrix() {
        if (!matrixContainer) return;
        matrixContainer.innerHTML = '';
        const totalYears = 85; 
        const fragment = document.createDocumentFragment();
        
        matrixDotsCache = [];
        
        for (let y = 0; y < totalYears; y++) {
            // Y-Axis label
            const yLabel = document.createElement("div");
            yLabel.className = "y-label";
            // Mark every 5 years implicitly (0, 5, 10...)
            yLabel.textContent = (y % 5 === 0 && y >= 10) ? y : "";
            fragment.appendChild(yLabel);

            // 52 Weeks dots
            for(let w = 0; w < 52; w++) {
                const dot = document.createElement("div");
                dot.className = "week-dot";
                fragment.appendChild(dot);
                matrixDotsCache.push(dot);
            }

            // Subtle decade separator (every 10 years, except the last one)
            if ((y + 1) % 10 === 0 && y !== totalYears - 1) {
                const spacer = document.createElement("div");
                spacer.className = "decade-spacer";
                fragment.appendChild(spacer);
            }
        }
        matrixContainer.appendChild(fragment);
    }

    function updateMatrix() {
        if (!dobInput.value) return;
        const dob = new Date(dobInput.value);
        const now = new Date();
        
        let weeksLived = 0;
        if (now > dob) {
            const diffTime = Math.abs(now - dob);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            weeksLived = Math.floor(diffDays / 7);
        }
        if (weeksLived > 52 * 85) weeksLived = 52 * 85; 
        
        const showCost = showCostToggle ? showCostToggle.checked : true;
        
        const overflowMessage = document.getElementById("overflowMessage");
        const totalLifeWeeks = 85 * 52;
        
        if (showCost && currentSavingsLifeWeeks > 0 && (weeksLived + currentSavingsLifeWeeks > totalLifeWeeks)) {
            const ageToGet = Math.floor((weeksLived + currentSavingsLifeWeeks) / 52);
            if (overflowMessage) {
                overflowMessage.innerHTML = `El coste temporal excede las casillas del calendario. Si mantienes las mismas condiciones, lo conseguirías aproximadamente a los <strong>${ageToGet} años de edad</strong>.`;
                overflowMessage.style.display = 'block';
            }
        } else {
            if (overflowMessage) overflowMessage.style.display = 'none';
        }
        
        for (let i = 0; i < matrixDotsCache.length; i++) {
            const dot = matrixDotsCache[i];
            let targetClass = 'week-dot';
            
            if (i < weeksLived) {
                targetClass = 'week-dot lived';
            } else if (showCost && i < weeksLived + currentSavingsLifeWeeks) {
                targetClass = 'week-dot savings-cost';
            }
            
            if (dot.className !== targetClass) {
                dot.className = targetClass;
            }
        }
    }

    if (dobInput) {
        drawMatrix();
        // Render initially if a DOB was loaded from storage
        if (dobInput.value) updateMatrix();
        
        const handleDobChange = (e) => {
            const newVal = e.target.value;
            localStorage.setItem('dob', newVal);
            dobInput.value = newVal;
            if(dobFreeInput) dobFreeInput.value = newVal;
            updateMatrix();
            calculateFreeTime();
        };

        dobInput.addEventListener('change', handleDobChange);
        if(dobFreeInput) dobFreeInput.addEventListener('change', handleDobChange);
    }

    if (showCostToggle) {
        showCostToggle.addEventListener('change', updateMatrix);
    }
});

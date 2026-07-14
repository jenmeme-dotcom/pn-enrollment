// Enrollment Website - JavaScript

const STORAGE_KEY = 'pn-enrollment-data';
const BASE_PROGRAM_COST = 15150;
const READ_SIGN_STATEMENT_IDS = ['initial-1', 'initial-2', 'initial-3', 'initial-4', 'initial-5'];
const ENTRANCE_EXAM_ACCESS_CODE = 'Nurse123';
const PDF_HEADER_LOGO_PATH = 'logo-top.png';
const PDF_FOOTER_LOGO_PATH = 'logo-footer.png';

let enrollmentData = getDefaultEnrollmentData();
let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;
let activeSignaturePointerId = null;
let paymentSignatureCanvas = null;
let paymentSignatureCtx = null;
let isPaymentDrawing = false;
let activePaymentSignaturePointerId = null;
let currentProcessStep = 1;
let pdfLogoAssetsPromise = null;

document.addEventListener('DOMContentLoaded', function () {
    initializeSignatureCanvas();
    initializePaymentSignatureCanvas();
    setupEventListeners();
    loadEnrollmentData();
    initializeIntroVideo();
    initializeEmbeddedYoutube();
    restoreUIFromData();
    updateProgressIndicator(1);
    updateMilestoneProgress();
    console.log('Enrollment website initialized successfully!');
});

function getDefaultEnrollmentData() {
    return {
        registration: {},
        entranceExam: {},
        signature: null,
        agreement: { accepted: false, signedBy: '', signedAt: '', statementInitials: {} },
        paymentPlan: null,
        paymentInfo: {
            cardName: '',
            cardLast4: '',
            expiry: '',
            billingZip: '',
            authorizationName: '',
            authorizationDate: '',
            authorizationSignatureImage: '',
            autoPay: false,
            authorized: false,
            methodFullPayment: false,
            methodRegFeeStart: false,
            methodRegFeeGraduation: false,
            noRefundChargebackAccepted: false,
            promiseToPayAccepted: false
        },
        financeDetails: {
            apr: '',
            downPayment: '',
            beginDate: '',
            frequency: 'monthly',
            annualPercentageRate: 0,
            financeCharge: 0,
            amountFinanced: 0,
            totalOfPayment: 0,
            totalSalesPrice: 0,
            numberOfPayments: 0,
            amountEachPayment: '',
            whenDueText: ''
        },
        institutionRep: {
            ssn: '',
            dob: '',
            gender: '',
            programTitle: 'Practical Nursing Program',
            clockHours: '',
            weeks: '',
            fullTime: false,
            partTime: false,
            dayClasses: false,
            eveningClasses: false,
            hoursPerWeek: '',
            startDate: '',
            anticipatedEndDate: '',
            tuition: '',
            registrationFee: '',
            books: '',
            materials: '',
            backgroundCheck: '',
            totalProgramCost: '15150'
        },
        portalAccount: { username: '', securityQuestion: '', termsAccepted: false, passwordSet: false, createdAt: '' },
        milestones: {},
        termEvaluations: {},
        milestoneSchedules: {},
        milestoneScheduleRequests: {}
    };
}

function initializeIntroVideo() {
    const video = document.getElementById('introVideo');
    const placeholder = document.getElementById('video-placeholder');
    if (!video || !placeholder) return;

    const source = video.querySelector('source');
    const sourcePath = (source?.getAttribute('src') || '').trim();
    const fallbackDetail = placeholder.querySelector('p:not(.video-title)');
    const showFallback = () => placeholder.classList.add('visible');
    const hideFallback = () => placeholder.classList.remove('visible');

    hideFallback();

    if (!sourcePath) {
        showFallback();
        return;
    }

    const tryAutoplay = function () {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(function () {
                if (fallbackDetail) {
                    fallbackDetail.innerHTML = 'Autoplay was blocked by your browser. Click the play button to start the video.';
                }
            });
        }
    };

    video.preload = 'metadata';
    video.muted = true;
    video.setAttribute('muted', '');
    video.addEventListener('loadedmetadata', function () {
        hideFallback();
        tryAutoplay();
    });
    video.addEventListener('loadeddata', hideFallback);
    video.addEventListener('canplay', hideFallback);
    video.addEventListener('play', hideFallback);
    video.addEventListener('error', function () {
        if (fallbackDetail) {
            fallbackDetail.innerHTML = 'Video could not be loaded. Check that <strong>enrollment-process.mp4</strong> (or <strong>enrollment-process.mp4.mp4</strong>) is in this folder and encoded as H.264 MP4.';
        }
        showFallback();
    });

    // Trigger source loading on first render for local file workflow.
    video.load();
    tryAutoplay();
}

function initializeEmbeddedYoutube() {
    const iframe = document.getElementById('intro-youtube');
    const fallback = document.getElementById('video-file-fallback');
    const container = document.getElementById('video-container');
    if (!iframe || !fallback || !container) return;

    const videoId = (iframe.dataset.videoId || 'ZBX1CoJZ-JY').trim();
    const fallbackLink = fallback.querySelector('a[href*="youtu"]');
    if (fallbackLink && videoId) {
        fallbackLink.href = `https://youtu.be/${encodeURIComponent(videoId)}`;
    }

    if (window.location.protocol === 'file:') {
        container.classList.add('file-mode');
        fallback.classList.add('visible');
        iframe.removeAttribute('src');
        return;
    } else {
        container.classList.remove('file-mode');
        fallback.classList.remove('visible');
    }

    if (!videoId) return;

    const originParam = window.location.origin && window.location.origin !== 'null'
        ? `&origin=${encodeURIComponent(window.location.origin)}`
        : '';
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1${originParam}`;
}

function initializeSignatureCanvas() {
    signatureCanvas = document.getElementById('signatureCanvas');
    if (!signatureCanvas) return;

    signatureCtx = signatureCanvas.getContext('2d');
    setCanvasSize();

    signatureCanvas.addEventListener('pointerdown', startDrawing);
    signatureCanvas.addEventListener('pointermove', drawSignature);
    signatureCanvas.addEventListener('pointerup', stopDrawing);
    signatureCanvas.addEventListener('pointercancel', stopDrawing);
    signatureCanvas.addEventListener('lostpointercapture', stopDrawing);
    window.addEventListener('pointerup', stopDrawing);
    window.addEventListener('resize', debounce(setCanvasSize, 150));
}

function initializePaymentSignatureCanvas() {
    paymentSignatureCanvas = document.getElementById('paymentSignatureCanvas');
    if (!paymentSignatureCanvas) return;

    paymentSignatureCtx = paymentSignatureCanvas.getContext('2d');
    setPaymentCanvasSize();

    paymentSignatureCanvas.addEventListener('pointerdown', startPaymentDrawing);
    paymentSignatureCanvas.addEventListener('pointermove', drawPaymentSignature);
    paymentSignatureCanvas.addEventListener('pointerup', stopPaymentDrawing);
    paymentSignatureCanvas.addEventListener('pointercancel', stopPaymentDrawing);
    paymentSignatureCanvas.addEventListener('lostpointercapture', stopPaymentDrawing);
    window.addEventListener('pointerup', stopPaymentDrawing);
    window.addEventListener('resize', debounce(setPaymentCanvasSize, 150));
}

function setCanvasSize() {
    if (!signatureCanvas || !signatureCtx) return;
    const width = Math.max(260, Math.floor(signatureCanvas.clientWidth));
    const height = 120;
    if (signatureCanvas.width === width && signatureCanvas.height === height) return;

    signatureCanvas.width = width;
    signatureCanvas.height = height;
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';
    signatureCtx.strokeStyle = '#1f2933';

    if (enrollmentData.signature) restoreSignature(enrollmentData.signature);
}

function getCanvasPoint(event) {
    const rect = signatureCanvas.getBoundingClientRect();
    const scaleX = rect.width ? signatureCanvas.width / rect.width : 1;
    const scaleY = rect.height ? signatureCanvas.height / rect.height : 1;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return {
        x: Math.max(0, Math.min(signatureCanvas.width, x)),
        y: Math.max(0, Math.min(signatureCanvas.height, y))
    };
}

function startDrawing(event) {
    if (!signatureCtx || !signatureCanvas) return;
    event.preventDefault();
    isDrawing = true;
    activeSignaturePointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
    if (signatureCanvas.setPointerCapture && activeSignaturePointerId !== null) {
        try {
            signatureCanvas.setPointerCapture(activeSignaturePointerId);
        } catch (error) {
            // No-op: continue drawing even if pointer capture is unavailable.
        }
    }
    const point = getCanvasPoint(event);
    signatureCtx.beginPath();
    signatureCtx.moveTo(point.x, point.y);
}

function drawSignature(event) {
    if (!isDrawing || !signatureCtx) return;
    if (
        activeSignaturePointerId !== null
        && typeof event.pointerId === 'number'
        && event.pointerId !== activeSignaturePointerId
    ) {
        return;
    }
    event.preventDefault();
    const point = getCanvasPoint(event);
    signatureCtx.lineTo(point.x, point.y);
    signatureCtx.stroke();
}

function stopDrawing(event) {
    if (!isDrawing || !signatureCtx || !signatureCanvas) return;
    if (
        activeSignaturePointerId !== null
        && event
        && typeof event.pointerId === 'number'
        && event.pointerId !== activeSignaturePointerId
    ) {
        return;
    }
    isDrawing = false;
    signatureCtx.closePath();
    if (signatureCanvas.releasePointerCapture && activeSignaturePointerId !== null) {
        try {
            signatureCanvas.releasePointerCapture(activeSignaturePointerId);
        } catch (error) {
            // No-op: pointer may already be released.
        }
    }
    activeSignaturePointerId = null;
}

function signatureHasInk() {
    if (!signatureCanvas || !signatureCtx) return false;
    const pixels = signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] !== 0) return true;
    }
    return false;
}

function restoreSignature(dataUrl) {
    if (!signatureCtx || !signatureCanvas || !dataUrl) return;
    const image = new Image();
    image.onload = function () {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        signatureCtx.drawImage(image, 0, 0, signatureCanvas.width, signatureCanvas.height);
    };
    image.src = dataUrl;
}

function toDateInputValue(isoDate) {
    if (!isoDate) return '';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
}

function getSelectedAgreementDateIso() {
    const dateInput = document.getElementById('signature-date');
    const selectedDate = (dateInput?.value || '').trim();
    if (!selectedDate) return '';
    const parsed = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString();
}

function updateSignatureDetails(name, isoDate) {
    const nameEl = document.getElementById('signature-name');
    const dateEl = document.getElementById('signature-date');
    if (nameEl) nameEl.value = name || '';
    if (dateEl) dateEl.value = toDateInputValue(isoDate);
}

function clearSignature() {
    if (!signatureCtx || !signatureCanvas) return;
    signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    enrollmentData.signature = null;
    enrollmentData.agreement.signedAt = '';
    saveEnrollmentData();
    updateSignatureDetails(enrollmentData.agreement.signedBy, '');
}

function saveSignature() {
    if (!signatureCanvas || !signatureCtx) return false;
    if (!signatureHasInk()) {
        showAlert('Please sign before continuing.', 'error');
        return false;
    }

    const typedNameInput = document.getElementById('agreementFullName');
    const printedNameInput = document.getElementById('signature-name');
    const typedName = (typedNameInput?.value || '').trim();
    const printedName = (printedNameInput?.value || '').trim();
    const fallbackName = getRegistrationFullName();
    const signedName = typedName || printedName || fallbackName;
    if (!signedName) {
        showAlert('Please enter your full legal name before saving signature.', 'error');
        return false;
    }

    const selectedDateIso = getSelectedAgreementDateIso() || new Date().toISOString();
    if (typedNameInput) typedNameInput.value = signedName;
    if (printedNameInput) printedNameInput.value = signedName;

    enrollmentData.signature = signatureCanvas.toDataURL('image/png');
    enrollmentData.agreement.signedBy = signedName;
    enrollmentData.agreement.signedAt = selectedDateIso;
    saveEnrollmentData();
    updateSignatureDetails(signedName, selectedDateIso);
    showAlert('Signature saved successfully.', 'success');
    return true;
}

function setPaymentCanvasSize() {
    if (!paymentSignatureCanvas || !paymentSignatureCtx) return;
    const width = Math.max(260, Math.floor(paymentSignatureCanvas.clientWidth));
    const height = 120;
    if (paymentSignatureCanvas.width === width && paymentSignatureCanvas.height === height) return;

    paymentSignatureCanvas.width = width;
    paymentSignatureCanvas.height = height;
    paymentSignatureCtx.lineWidth = 2;
    paymentSignatureCtx.lineCap = 'round';
    paymentSignatureCtx.lineJoin = 'round';
    paymentSignatureCtx.strokeStyle = '#1f2933';

    if (enrollmentData.paymentInfo?.authorizationSignatureImage) {
        restorePaymentSignature(enrollmentData.paymentInfo.authorizationSignatureImage);
    } else {
        updatePaymentSignatureStatus(false);
    }
}

function getPaymentCanvasPoint(event) {
    const rect = paymentSignatureCanvas.getBoundingClientRect();
    const scaleX = rect.width ? paymentSignatureCanvas.width / rect.width : 1;
    const scaleY = rect.height ? paymentSignatureCanvas.height / rect.height : 1;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return {
        x: Math.max(0, Math.min(paymentSignatureCanvas.width, x)),
        y: Math.max(0, Math.min(paymentSignatureCanvas.height, y))
    };
}

function startPaymentDrawing(event) {
    if (!paymentSignatureCtx || !paymentSignatureCanvas) return;
    event.preventDefault();
    updatePaymentSignatureStatus(false);
    isPaymentDrawing = true;
    activePaymentSignaturePointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
    if (paymentSignatureCanvas.setPointerCapture && activePaymentSignaturePointerId !== null) {
        try {
            paymentSignatureCanvas.setPointerCapture(activePaymentSignaturePointerId);
        } catch (error) {
            // No-op: continue drawing even if pointer capture is unavailable.
        }
    }
    const point = getPaymentCanvasPoint(event);
    paymentSignatureCtx.beginPath();
    paymentSignatureCtx.moveTo(point.x, point.y);
}

function drawPaymentSignature(event) {
    if (!isPaymentDrawing || !paymentSignatureCtx) return;
    if (
        activePaymentSignaturePointerId !== null
        && typeof event.pointerId === 'number'
        && event.pointerId !== activePaymentSignaturePointerId
    ) {
        return;
    }
    event.preventDefault();
    const point = getPaymentCanvasPoint(event);
    paymentSignatureCtx.lineTo(point.x, point.y);
    paymentSignatureCtx.stroke();
}

function stopPaymentDrawing(event) {
    if (!isPaymentDrawing || !paymentSignatureCtx || !paymentSignatureCanvas) return;
    if (
        activePaymentSignaturePointerId !== null
        && event
        && typeof event.pointerId === 'number'
        && event.pointerId !== activePaymentSignaturePointerId
    ) {
        return;
    }
    isPaymentDrawing = false;
    paymentSignatureCtx.closePath();
    if (paymentSignatureCanvas.releasePointerCapture && activePaymentSignaturePointerId !== null) {
        try {
            paymentSignatureCanvas.releasePointerCapture(activePaymentSignaturePointerId);
        } catch (error) {
            // No-op: pointer may already be released.
        }
    }
    activePaymentSignaturePointerId = null;
}

function paymentSignatureHasInk() {
    if (!paymentSignatureCanvas || !paymentSignatureCtx) return false;
    const pixels = paymentSignatureCtx.getImageData(0, 0, paymentSignatureCanvas.width, paymentSignatureCanvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] !== 0) return true;
    }
    return false;
}

function updatePaymentSignatureStatus(isSaved) {
    const status = document.getElementById('payment-signature-status');
    const badge = document.getElementById('payment-signature-badge');
    if (status) {
        status.textContent = isSaved ? 'Signature saved.' : 'Signature not saved yet.';
    }
    if (badge) {
        badge.hidden = !isSaved;
    }
}

function restorePaymentSignature(dataUrl) {
    if (!paymentSignatureCtx || !paymentSignatureCanvas) return;
    if (!dataUrl) {
        paymentSignatureCtx.clearRect(0, 0, paymentSignatureCanvas.width, paymentSignatureCanvas.height);
        updatePaymentSignatureStatus(false);
        return;
    }

    const image = new Image();
    image.onload = function () {
        paymentSignatureCtx.clearRect(0, 0, paymentSignatureCanvas.width, paymentSignatureCanvas.height);
        paymentSignatureCtx.drawImage(image, 0, 0, paymentSignatureCanvas.width, paymentSignatureCanvas.height);
        updatePaymentSignatureStatus(true);
    };
    image.src = dataUrl;
}

function clearPaymentSignature() {
    if (!paymentSignatureCtx || !paymentSignatureCanvas) return;
    paymentSignatureCtx.clearRect(0, 0, paymentSignatureCanvas.width, paymentSignatureCanvas.height);
    enrollmentData.paymentInfo = {
        ...(enrollmentData.paymentInfo || {}),
        authorizationSignatureImage: ''
    };
    saveEnrollmentData();
    updatePaymentSignatureStatus(false);
}

function savePaymentSignature() {
    if (!paymentSignatureCanvas || !paymentSignatureCtx) return false;
    if (!paymentSignatureHasInk()) {
        showAlert('Please sign in the payment signature box before saving.', 'error');
        return false;
    }

    enrollmentData.paymentInfo = {
        ...(enrollmentData.paymentInfo || {}),
        authorizationSignatureImage: paymentSignatureCanvas.toDataURL('image/png')
    };
    saveEnrollmentData();
    updatePaymentSignatureStatus(true);
    showAlert('Payment signature saved successfully.', 'success');
    return true;
}

function getProcessStepForPage(stepNumber) {
    const pageToProcessStepMap = {
        1: 1,
        2: 2,
        3: 3,
        4: 6,
        5: 8
    };
    return pageToProcessStepMap[stepNumber] || 1;
}

function getPageStepForProcess(processStep) {
    const processToPageStepMap = {
        1: 1,
        2: 2,
        3: 3,
        4: 3,
        5: 3,
        6: 4,
        7: 5,
        8: 5
    };
    return processToPageStepMap[processStep] || 1;
}

function updateProgressIndicator(stepNumber, processStepOverride) {
    const activeProcessStep = Number.isInteger(processStepOverride)
        ? processStepOverride
        : getProcessStepForPage(stepNumber);
    currentProcessStep = Math.max(currentProcessStep, activeProcessStep);

    document.querySelectorAll('.step-indicator .step').forEach((indicator) => {
        const indicatorStep = Number.parseInt(
            indicator.id.replace('step-indicator-', ''),
            10
        );
        if (Number.isNaN(indicatorStep)) return;

        const isCompleted = indicatorStep < currentProcessStep;
        const isActive = indicatorStep === activeProcessStep;
        indicator.classList.toggle('completed', isCompleted);
        indicator.classList.toggle('locked', isCompleted && !isActive);
        indicator.classList.toggle('active', isActive);
        indicator.setAttribute('aria-disabled', isCompleted && !isActive ? 'true' : 'false');
    });
}

function updateStep3SectionVisibility(activeProcessStep) {
    const portalSection = document.getElementById('portal-setup-section');
    const entranceExamSection = document.getElementById('entrance-exam-section');
    const agreementSection = document.getElementById('agreement-content-section');
    const step3Title = document.getElementById('step-3-title');
    if (!portalSection || !entranceExamSection || !agreementSection) return;

    const showPortal = activeProcessStep === 3;
    const showEntranceExam = activeProcessStep === 4;
    const showAgreement = activeProcessStep === 5;

    portalSection.hidden = !showPortal;
    entranceExamSection.hidden = !showEntranceExam;
    agreementSection.hidden = !showAgreement;

    if (step3Title) {
        step3Title.textContent = showPortal
            ? 'Create Student Portal Account'
            : showEntranceExam
                ? 'Entrance Exam Registration'
                : 'Enrollment Agreement & Signature';
    }
}

function updateStep5SectionVisibility(activeProcessStep) {
    const acceptanceContent = document.getElementById('step-5-acceptance-content');
    const trackerContent = document.getElementById('step-5-tracker-content');
    const step5Title = document.getElementById('step-5-title');
    if (!acceptanceContent || !trackerContent) return;

    const showTracker = activeProcessStep === 8;
    acceptanceContent.hidden = showTracker;
    trackerContent.hidden = !showTracker;

    if (step5Title) {
        step5Title.textContent = showTracker
            ? 'Practical Nursing Milestone Tracker'
            : 'Acceptance & Next Steps';
    }
}

function goToStep(stepNumber, processStepOverride) {
    const targetProcessStep = Number.isInteger(processStepOverride)
        ? processStepOverride
        : getProcessStepForPage(stepNumber);

    if (targetProcessStep < currentProcessStep) {
        showAlert('This completed section is finalized and can no longer be edited.', 'info');
        return false;
    }

    document.querySelectorAll('.step-content').forEach((step) => step.classList.remove('active'));

    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) targetStep.classList.add('active');
    updateProgressIndicator(stepNumber, processStepOverride);
    if (stepNumber === 3) updateStep3SectionVisibility(targetProcessStep);
    if (stepNumber === 5) updateStep5SectionVisibility(targetProcessStep);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (stepNumber === 5) populateMilestones();
    return true;
}

function getRegistrationFullName() {
    const first = enrollmentData.registration.firstName || '';
    const last = enrollmentData.registration.lastName || '';
    return `${first} ${last}`.trim();
}

function getRegistrationFormData() {
    return {
        firstName: (document.getElementById('firstName')?.value || '').trim(),
        lastName: (document.getElementById('lastName')?.value || '').trim(),
        email: (document.getElementById('email')?.value || '').trim(),
        phone: (document.getElementById('phone')?.value || '').trim(),
        dob: document.getElementById('dob')?.value || '',
        ssn: (document.getElementById('ssn')?.value || '').trim(),
        street: (document.getElementById('street')?.value || '').trim(),
        city: (document.getElementById('city')?.value || '').trim(),
        state: (document.getElementById('state')?.value || '').trim().toUpperCase(),
        zip: (document.getElementById('zip')?.value || '').trim(),
        highschool: (document.getElementById('highschool')?.value || '').trim(),
        graduation: (document.getElementById('graduation')?.value || '').trim(),
        startTerm: document.getElementById('startTerm')?.value || '',
        education: (document.getElementById('education')?.value || '').trim(),
        educationCredential: document.getElementById('educationCredential')?.value || '',
        hearAboutUs: document.getElementById('hearAboutUs')?.value || ''
    };
}

function validateAndSaveRegistration() {
    const fields = getRegistrationFormData();
    const required = ['firstName', 'lastName', 'email', 'phone', 'dob', 'ssn', 'street', 'city', 'state', 'zip', 'highschool', 'graduation', 'startTerm', 'education', 'educationCredential', 'hearAboutUs'];
    const missing = required.find((field) => !fields[field]);
    if (missing) {
        showAlert('Please complete all required fields before continuing.', 'error');
        return false;
    }

    const idDocumentInput = document.getElementById('id-document-upload');
    const diplomaGedInput = document.getElementById('diploma-ged-upload');
    const diplomaTranslationInput = document.getElementById('diploma-translation-upload');
    const existingRegistration = enrollmentData.registration || {};

    const idDocumentFileName = idDocumentInput?.files?.[0]?.name || existingRegistration.idDocumentFileName || '';
    const diplomaGedFileName = diplomaGedInput?.files?.[0]?.name || existingRegistration.diplomaGedFileName || '';
    let diplomaTranslationFileName = diplomaTranslationInput?.files?.[0]?.name || existingRegistration.diplomaTranslationFileName || '';

    if (!idDocumentFileName) {
        showAlert("Please upload an ID or Driver's License document.", 'error');
        return false;
    }

    if (!diplomaGedFileName) {
        showAlert('Please upload a High School Diploma or GED document.', 'error');
        return false;
    }

    const translationRequired = fields.educationCredential === 'hs-diploma-translation';
    if (translationRequired && !diplomaTranslationFileName) {
        showAlert('Please upload the diploma translation document.', 'error');
        return false;
    }
    if (!translationRequired) diplomaTranslationFileName = '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
        showAlert('Please enter a valid email address.', 'error');
        return false;
    }

    const phoneDigits = fields.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
        showAlert('Please enter a valid 10-digit phone number.', 'error');
        return false;
    }

    if (!/^\d{4}$/.test(fields.ssn)) {
        showAlert('Please enter the last 4 digits of SSN.', 'error');
        return false;
    }

    if (!/^[A-Z]{2}$/.test(fields.state)) {
        showAlert('State must be a 2-letter abbreviation (for example, FL).', 'error');
        return false;
    }

    if (!/^\d{5}$/.test(fields.zip)) {
        showAlert('ZIP code must be 5 digits.', 'error');
        return false;
    }

    const graduationYear = Number(fields.graduation);
    const maxYear = new Date().getFullYear() + 1;
    if (Number.isNaN(graduationYear) || graduationYear < 1950 || graduationYear > maxYear) {
        showAlert('Please enter a valid graduation year.', 'error');
        return false;
    }

    const birthDate = new Date(fields.dob);
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age -= 1;
    if (age < 18) {
        showAlert('Students must be at least 18 years old to enroll.', 'error');
        return false;
    }

    fields.phone = formatPhoneNumber(fields.phone);
    fields.idDocumentFileName = idDocumentFileName;
    fields.diplomaGedFileName = diplomaGedFileName;
    fields.diplomaTranslationFileName = diplomaTranslationFileName;
    enrollmentData.registration = fields;
    saveEnrollmentData();

    const agreementNameInput = document.getElementById('agreementFullName');
    if (agreementNameInput && !agreementNameInput.value.trim()) {
        agreementNameInput.value = `${fields.firstName} ${fields.lastName}`;
    }
    const signatureNameInput = document.getElementById('signature-name');
    if (signatureNameInput && !signatureNameInput.value.trim()) {
        signatureNameInput.value = `${fields.firstName} ${fields.lastName}`;
    }

    showAlert('Registration saved. Moving to portal setup.', 'success');
    setTimeout(() => goToStep(3), 600);
    return true;
}

function validateAndSavePortalAccount() {
    const portalUsername = (document.getElementById('portal-username')?.value || '').trim();
    const portalPassword = document.getElementById('portal-password')?.value || '';
    const portalConfirmPassword = document.getElementById('portal-confirm-password')?.value || '';
    const portalSecurityQuestion = document.getElementById('portal-security-question')?.value || '';
    const portalSecurityAnswer = (document.getElementById('portal-security-answer')?.value || '').trim();
    const portalTermsAccepted = document.getElementById('portal-terms-checkbox')?.checked || false;

    if (!/^[a-zA-Z0-9._-]{4,20}$/.test(portalUsername)) {
        showAlert('Portal username must be 4-20 characters and can include letters, numbers, dot, dash, or underscore.', 'error');
        return false;
    }
    if (portalPassword.length < 8) {
        showAlert('Portal password must be at least 8 characters.', 'error');
        return false;
    }
    if (portalPassword !== portalConfirmPassword) {
        showAlert('Portal password and confirm password do not match.', 'error');
        return false;
    }
    if (!portalSecurityQuestion) {
        showAlert('Please select a security question for the student portal account.', 'error');
        return false;
    }
    if (!portalSecurityAnswer) {
        showAlert('Please provide a security answer for the student portal account.', 'error');
        return false;
    }
    if (!portalTermsAccepted) {
        showAlert('Please confirm student portal account setup to continue.', 'error');
        return false;
    }

    enrollmentData.portalAccount = {
        username: portalUsername,
        securityQuestion: portalSecurityQuestion,
        termsAccepted: portalTermsAccepted,
        passwordSet: true,
        createdAt: enrollmentData.portalAccount?.createdAt || new Date().toISOString()
    };
    saveEnrollmentData();
    restoreEntranceExamFields();

    showAlert('Portal account saved. Moving to entrance exam.', 'success');
    setTimeout(() => goToStep(3, 4), 600);
    return true;
}

function getEntranceExamFormData() {
    const existingExam = enrollmentData.entranceExam || {};
    const priorScoreUpload = document.getElementById('exam-prior-score-upload');
    const degreeProofUpload = document.getElementById('exam-degree-proof-upload');

    return {
        center: document.getElementById('exam-center')?.value || '',
        examType: document.getElementById('exam-type')?.value || '',
        examDate: document.getElementById('exam-date')?.value || '',
        examTime: document.getElementById('exam-time')?.value || '',
        accessCode: (document.getElementById('exam-access-code')?.value || '').trim(),
        firstName: (document.getElementById('exam-first-name')?.value || '').trim(),
        lastName: (document.getElementById('exam-last-name')?.value || '').trim(),
        email: (document.getElementById('exam-email')?.value || '').trim(),
        textPhone: (document.getElementById('exam-text-phone')?.value || '').trim(),
        termsAccepted: Boolean(document.getElementById('exam-terms-checkbox')?.checked),
        priorScoreSubmitted: Boolean(document.getElementById('exam-prior-score-checkbox')?.checked),
        priorScoreFileName: priorScoreUpload?.files?.length
            ? priorScoreUpload.files[0].name
            : (existingExam.priorScoreFileName || ''),
        degreeWaiverRequested: Boolean(document.getElementById('exam-degree-waiver-checkbox')?.checked),
        degreeLevel: document.getElementById('exam-degree-level')?.value || '',
        degreeProofFileName: degreeProofUpload?.files?.length
            ? degreeProofUpload.files[0].name
            : (existingExam.degreeProofFileName || '')
    };
}

function validateAndContinueFromEntranceExam() {
    const fields = getEntranceExamFormData();
    const usingAlternativePath = fields.priorScoreSubmitted || fields.degreeWaiverRequested;
    const requiresScheduledExam = !usingAlternativePath;

    if (!fields.firstName || !fields.lastName || !fields.email) {
        showAlert('Please complete the required student information fields.', 'error');
        return false;
    }

    if (requiresScheduledExam && (!fields.center || !fields.examType || !fields.examDate || !fields.examTime)) {
        showAlert('Please complete all required entrance exam scheduling fields.', 'error');
        return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
        showAlert('Please enter a valid entrance exam email address.', 'error');
        return false;
    }

    if (fields.textPhone) {
        const textPhoneDigits = fields.textPhone.replace(/\D/g, '');
        if (textPhoneDigits.length !== 10) {
            showAlert('Text notification phone must be a valid 10-digit number.', 'error');
            return false;
        }
    }

    if (!fields.accessCode) {
        showAlert('Please enter the admissions access code to continue.', 'error');
        return false;
    }

    if (fields.accessCode !== ENTRANCE_EXAM_ACCESS_CODE) {
        showAlert('Incorrect admissions access code. You cannot continue to the agreement page.', 'error');
        return false;
    }

    if (fields.priorScoreSubmitted && !fields.priorScoreFileName) {
        showAlert('Please upload your prior entrance exam score report for admissions review.', 'error');
        return false;
    }

    if (fields.degreeWaiverRequested && !fields.degreeLevel) {
        showAlert('Please select your highest completed degree for the waiver request.', 'error');
        return false;
    }

    if (fields.degreeWaiverRequested && !fields.degreeProofFileName) {
        showAlert('Please upload transcript or degree documentation for the waiver request.', 'error');
        return false;
    }

    if (!fields.termsAccepted) {
        showAlert('Please confirm your entrance exam information is accurate.', 'error');
        return false;
    }

    fields.textPhone = fields.textPhone ? formatPhoneNumber(fields.textPhone) : '';
    delete fields.accessCode;
    fields.completed = true;
    fields.completedAt = new Date().toISOString();
    enrollmentData.entranceExam = fields;
    saveEnrollmentData();

    showAlert('Entrance exam registration saved. Moving to agreement.', 'success');
    setTimeout(() => goToStep(3, 5), 600);
    return true;
}

function normalizeName(value) {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function getAgreementInitialsFromForm() {
    const initials = {};
    READ_SIGN_STATEMENT_IDS.forEach((id) => {
        const input = document.getElementById(id);
        initials[id] = (input?.value || '').trim().toUpperCase();
    });
    return initials;
}

function areAgreementInitialsComplete(initialsData) {
    return READ_SIGN_STATEMENT_IDS.every((id) => {
        const entry = initialsData?.[id] || {};
        return Boolean((typeof entry === 'string' ? entry : entry.initials || '').trim());
    });
}

function validateAndContinueFromAgreement() {
    const agreementCheckbox = document.getElementById('agree-checkbox');
    const agreementNameInput = document.getElementById('agreementFullName');
    const signatureNameInput = document.getElementById('signature-name');
    const typedName = (agreementNameInput?.value || '').trim();
    const printedName = (signatureNameInput?.value || '').trim();
    const signedName = typedName || printedName;
    const expectedName = getRegistrationFullName();

    if (!signedName) {
        showAlert('Please type your full legal name.', 'error');
        return false;
    }

    if (expectedName && normalizeName(signedName) !== normalizeName(expectedName)) {
        showAlert('Typed name must match the name from registration.', 'error');
        return false;
    }

    const statementInitials = getAgreementInitialsFromForm();
    if (!areAgreementInitialsComplete(statementInitials)) {
        showAlert('Please add initials for each statement before continuing.', 'error');
        return false;
    }

    if (!agreementCheckbox?.checked) {
        showAlert('Please confirm that you agree to the enrollment terms.', 'error');
        return false;
    }

    if (!enrollmentData.signature && !signatureHasInk()) {
        showAlert('Please sign and save your digital signature before continuing.', 'error');
        return false;
    }

    const selectedDateIso = getSelectedAgreementDateIso() || enrollmentData.agreement.signedAt || new Date().toISOString();
    if (agreementNameInput) agreementNameInput.value = signedName;
    if (signatureNameInput) signatureNameInput.value = signedName;

    enrollmentData.agreement.accepted = true;
    enrollmentData.agreement.signedBy = signedName;
    enrollmentData.agreement.signedAt = selectedDateIso;
    enrollmentData.agreement.statementInitials = statementInitials;
    saveEnrollmentData();
    updateSignatureDetails(signedName, selectedDateIso);

    showAlert('Agreement completed. Moving to payment.', 'success');
    setTimeout(() => goToStep(4), 600);
    return true;
}

function addMonths(baseDate, monthsToAdd) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() + monthsToAdd);
    return date;
}

function buildPaymentPlan(planNumber) {
    const startDate = new Date();

    switch (planNumber) {
        case 1:
            return {
                id: 1,
                name: 'Full Payment',
                totalAmount: BASE_PROGRAM_COST,
                fee: 0,
                schedule: [{ label: 'Full Payment', amount: BASE_PROGRAM_COST, dueDate: startDate.toISOString() }]
            };
        case 2:
            return {
                id: 2,
                name: 'Two Payments',
                totalAmount: 15600,
                fee: 450,
                schedule: [
                    { label: 'First Payment (50%)', amount: 7800, dueDate: startDate.toISOString() },
                    { label: 'Second Payment (50%)', amount: 7800, dueDate: addMonths(startDate, 6).toISOString() }
                ]
            };
        case 3: {
            const schedule = [];
            for (let i = 0; i < 12; i += 1) {
                schedule.push({ label: `Payment ${i + 1}`, amount: 1350, dueDate: addMonths(startDate, i).toISOString() });
            }
            return { id: 3, name: '12 Monthly Payments', totalAmount: 16200, fee: 1050, schedule };
        }
        case 4: {
            const schedule = [];
            for (let i = 0; i < 6; i += 1) {
                schedule.push({ label: `Payment ${i + 1}`, amount: 2650, dueDate: addMonths(startDate, i).toISOString() });
            }
            return { id: 4, name: '6 Monthly Payments', totalAmount: 15900, fee: 750, schedule };
        }
        case 5: {
            const schedule = [];
            for (let i = 0; i < 11; i += 1) {
                schedule.push({ label: `Payment ${i + 1}`, amount: 500, dueDate: addMonths(startDate, i).toISOString() });
            }
            schedule.push({
                label: 'Payment 12 (Remaining Balance)',
                amount: BASE_PROGRAM_COST - (500 * 11),
                dueDate: addMonths(startDate, 11).toISOString()
            });
            return {
                id: 5,
                name: '$500 Monthly + Month 12 Balance',
                totalAmount: BASE_PROGRAM_COST,
                fee: 0,
                schedule
            };
        }
        case 6: {
            const downPayment = 2000;
            const remainingBalance = BASE_PROGRAM_COST - downPayment;
            const monthlyAmount = Number((remainingBalance / 11).toFixed(2));
            const schedule = [{ label: 'Down Payment', amount: downPayment, dueDate: startDate.toISOString() }];

            for (let i = 0; i < 11; i += 1) {
                schedule.push({
                    label: `Monthly Payment ${i + 1}`,
                    amount: monthlyAmount,
                    dueDate: addMonths(startDate, i + 1).toISOString()
                });
            }

            const scheduledRemainder = Number((monthlyAmount * 11).toFixed(2));
            const finalAdjustment = Number((remainingBalance - scheduledRemainder).toFixed(2));
            if (finalAdjustment !== 0) {
                const lastIndex = schedule.length - 1;
                schedule[lastIndex].amount = Number((schedule[lastIndex].amount + finalAdjustment).toFixed(2));
            }

            return {
                id: 6,
                name: '$2,000 Down + Monthly Payments',
                totalAmount: BASE_PROGRAM_COST,
                fee: 0,
                schedule
            };
        }
        default:
            return null;
    }
}

function renderPaymentBreakdown(plan) {
    const breakdownBody = document.getElementById('breakdown-body');
    if (!breakdownBody) return;

    if (!plan?.schedule?.length) {
        breakdownBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;">Select a payment plan above</td></tr>';
        return;
    }

    const rows = plan.schedule.map((entry) => `
        <tr>
            <td>${entry.label}</td>
            <td>${formatCurrency(entry.amount)}</td>
            <td>${formatDate(new Date(entry.dueDate))}</td>
        </tr>
    `);
    breakdownBody.innerHTML = rows.join('');
}

function selectPaymentPlan(planNumber) {
    const radio = document.getElementById(`plan${planNumber}`);
    if (!radio) return;

    radio.checked = true;
    document.querySelectorAll('.payment-plan-card').forEach((card) => card.classList.remove('selected'));
    radio.closest('.payment-plan-card')?.classList.add('selected');
    updatePaymentBreakdown(planNumber);
}

function updatePaymentBreakdown(planNumber) {
    const plan = buildPaymentPlan(planNumber);
    if (!plan) return;
    enrollmentData.paymentPlan = plan;
    renderPaymentBreakdown(plan);
    updateFinanceCalculator(plan);
    saveEnrollmentData();
}

function parsePositiveNumber(value) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return number;
}

function getFinanceFrequencyText(frequency) {
    switch (frequency) {
        case 'weekly':
            return 'week';
        case 'bi-weekly':
            return 'two weeks';
        case 'monthly':
        default:
            return 'month';
    }
}

function getFinanceAmountEachPaymentText(plan) {
    if (!plan?.schedule?.length) return 'N/A';
    const firstAmount = plan.schedule[0].amount;
    const sameAmount = plan.schedule.every((entry) => entry.amount === firstAmount);
    if (sameAmount) return formatCurrency(firstAmount);
    if (plan.id === 5 && plan.schedule.length >= 12) {
        const lastAmount = plan.schedule[plan.schedule.length - 1].amount;
        return `11 x ${formatCurrency(firstAmount)}, then ${formatCurrency(lastAmount)}`;
    }
    if (plan.id === 6 && plan.schedule.length >= 12) {
        const downPayment = plan.schedule[0].amount;
        const monthlyAmount = plan.schedule[1].amount;
        const finalMonthlyAmount = plan.schedule[plan.schedule.length - 1].amount;
        if (monthlyAmount === finalMonthlyAmount) {
            return `Down ${formatCurrency(downPayment)}, then ${formatCurrency(monthlyAmount)}/month`;
        }
        return `Down ${formatCurrency(downPayment)}, then 10 x ${formatCurrency(monthlyAmount)}, final ${formatCurrency(finalMonthlyAmount)}`;
    }
    return 'Varies by payment schedule';
}

function updateFinanceCalculator(planOverride) {
    const plan = planOverride || enrollmentData.paymentPlan;
    const aprInput = document.getElementById('finance-apr');
    const downPaymentInput = document.getElementById('finance-down-payment');
    const beginDateInput = document.getElementById('finance-begin-date');
    const frequencyInput = document.getElementById('finance-frequency');
    const aprOutput = document.getElementById('finance-apr-output');
    const financeChargeOutput = document.getElementById('finance-charge-output');
    const amountFinancedOutput = document.getElementById('amount-financed-output');
    const totalOfPaymentOutput = document.getElementById('total-of-payment-output');
    const totalSalesPriceOutput = document.getElementById('total-sales-price-output');
    const numberPaymentsOutput = document.getElementById('finance-number-payments');
    const amountEachOutput = document.getElementById('finance-amount-each-payment');
    const whenDueOutput = document.getElementById('finance-when-due');

    if (
        !aprInput || !downPaymentInput || !beginDateInput || !frequencyInput
        || !aprOutput || !financeChargeOutput || !amountFinancedOutput
        || !totalOfPaymentOutput || !totalSalesPriceOutput || !numberPaymentsOutput
        || !amountEachOutput || !whenDueOutput
    ) {
        return null;
    }

    if (!plan?.schedule?.length) {
        aprOutput.textContent = '0.00%';
        financeChargeOutput.textContent = '$0';
        amountFinancedOutput.textContent = '$0';
        totalOfPaymentOutput.textContent = '$0';
        totalSalesPriceOutput.textContent = '$0';
        numberPaymentsOutput.value = '';
        amountEachOutput.value = '';
        whenDueOutput.textContent = 'Select a payment plan to calculate due schedule.';
        return null;
    }

    const apr = parsePositiveNumber(aprInput.value || '0');
    const downPayment = parsePositiveNumber(downPaymentInput.value || '0');
    const frequency = (frequencyInput.value || 'monthly').trim();
    const firstDueDate = plan.schedule[0]?.dueDate ? plan.schedule[0].dueDate.slice(0, 10) : '';
    if (!beginDateInput.value && firstDueDate) beginDateInput.value = firstDueDate;
    const beginDate = beginDateInput.value || firstDueDate;

    const amountFinanced = Math.max(plan.totalAmount - downPayment, 0);
    const numberOfPayments = plan.schedule.length;
    const termMonths = Math.max(numberOfPayments, 1);
    const financeCharge = amountFinanced * (apr / 100) * (termMonths / 12);
    const totalOfPayment = amountFinanced + financeCharge;
    const totalSalesPrice = totalOfPayment + downPayment;
    const amountEachPayment = getFinanceAmountEachPaymentText(plan);
    const whenDueText = beginDate
        ? `Beginning on ${formatDate(new Date(`${beginDate}T12:00:00`))} and on the same day each ${getFinanceFrequencyText(frequency)} thereafter.`
        : 'Select a beginning date.';

    aprOutput.textContent = `${apr.toFixed(2)}%`;
    financeChargeOutput.textContent = formatCurrency(financeCharge);
    amountFinancedOutput.textContent = formatCurrency(amountFinanced);
    totalOfPaymentOutput.textContent = formatCurrency(totalOfPayment);
    totalSalesPriceOutput.textContent = formatCurrency(totalSalesPrice);
    numberPaymentsOutput.value = String(numberOfPayments);
    amountEachOutput.value = amountEachPayment;
    whenDueOutput.textContent = whenDueText;

    const financeDetails = {
        apr: aprInput.value || '',
        downPayment: downPaymentInput.value || '',
        beginDate,
        frequency,
        annualPercentageRate: apr,
        financeCharge,
        amountFinanced,
        totalOfPayment,
        totalSalesPrice,
        numberOfPayments,
        amountEachPayment,
        whenDueText
    };
    enrollmentData.financeDetails = financeDetails;
    return financeDetails;
}

function normalizeCardNumber(value) {
    return value.replace(/\s/g, '');
}

function formatCardNumberInput(value) {
    const rawDigits = value.replace(/\D/g, '');
    const isAmex = /^3[47]/.test(rawDigits);
    const maxDigits = isAmex ? 15 : 16;
    const digits = rawDigits.slice(0, maxDigits);

    if (isAmex) {
        const p1 = digits.slice(0, 4);
        const p2 = digits.slice(4, 10);
        const p3 = digits.slice(10, 15);
        return [p1, p2, p3].filter(Boolean).join(' ');
    }

    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function isSupportedCardNumber(cardNumber) {
    if (!/^\d{15,16}$/.test(cardNumber)) return false;
    const isAmex = /^3[47]/.test(cardNumber);
    if (isAmex) return cardNumber.length === 15 && isLuhnValid(cardNumber);
    return cardNumber.length === 16 && isLuhnValid(cardNumber);
}

function isLuhnValid(cardNumber) {
    let sum = 0;
    let shouldDouble = false;
    for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
        let digit = Number(cardNumber.charAt(i));
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
}

function isValidExpiry(expiryValue) {
    const match = expiryValue.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return false;

    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const expiryEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return expiryEnd.getTime() >= Date.now();
}

function validateAndProcessPayment() {
    const cardName = (document.getElementById('card-name')?.value || '').trim();
    const cardNumberRaw = document.getElementById('card-number')?.value || '';
    const expiry = (document.getElementById('expiry')?.value || '').trim();
    const cvv = (document.getElementById('cvv')?.value || '').trim();
    const billingZip = (document.getElementById('billing-zip')?.value || '').trim();
    const authorizationName = (document.getElementById('payment-authorization-name')?.value || '').trim();
    const authorizationDate = document.getElementById('payment-authorization-date')?.value || '';
    const drawnPaymentSignatureImage = paymentSignatureHasInk() && paymentSignatureCanvas
        ? paymentSignatureCanvas.toDataURL('image/png')
        : '';
    const authorizationSignatureImage = drawnPaymentSignatureImage || enrollmentData.paymentInfo?.authorizationSignatureImage || '';
    const autoPay = document.getElementById('auto-pay-checkbox')?.checked || false;
    const authorized = document.getElementById('payment-authorize-checkbox')?.checked || false;
    const methodFullPayment = document.getElementById('method-full-payment')?.checked || false;
    const methodRegFeeStart = document.getElementById('method-reg-fee-start')?.checked || false;
    const methodRegFeeGraduation = document.getElementById('method-reg-fee-graduation')?.checked || false;
    const hasPaymentMethodSelected = methodFullPayment || methodRegFeeStart || methodRegFeeGraduation;
    const noRefundChargebackAccepted = document.getElementById('no-refund-chargeback-checkbox')?.checked || false;
    const promiseToPayAccepted = document.getElementById('promise-to-pay-checkbox')?.checked || false;
    const portalAccount = enrollmentData.portalAccount || {};
    const entranceExam = enrollmentData.entranceExam || {};

    if (!enrollmentData.paymentPlan) {
        showAlert('Please select a payment plan.', 'error');
        return false;
    }
    if (!cardName) {
        showAlert('Please enter the name on card.', 'error');
        return false;
    }

    const cardNumber = normalizeCardNumber(cardNumberRaw);
    if (!isSupportedCardNumber(cardNumber)) {
        showAlert('Please enter a valid card number. American Express uses 15 digits; other cards use 16 digits.', 'error');
        return false;
    }
    if (!isValidExpiry(expiry)) {
        showAlert('Please enter a valid expiration date in MM/YY format.', 'error');
        return false;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
        showAlert('Please enter a valid CVV.', 'error');
        return false;
    }
    if (!/^\d{5}$/.test(billingZip)) {
        showAlert('Billing ZIP code must be 5 digits.', 'error');
        return false;
    }
    if (!authorizationName) {
        showAlert('Please enter the authorized name for payment.', 'error');
        return false;
    }
    if (!authorizationDate) {
        showAlert('Please select the payment authorization date.', 'error');
        return false;
    }
    if (!authorizationSignatureImage) {
        showAlert('Please provide a payment signature before continuing.', 'error');
        return false;
    }
    if (!hasPaymentMethodSelected) {
        showAlert('Please select one method of payment.', 'error');
        return false;
    }
    if (!authorized) {
        showAlert('Please authorize payment processing to continue.', 'error');
        return false;
    }
    if (!noRefundChargebackAccepted) {
        showAlert('Please accept the no refund / no chargeback policy to continue.', 'error');
        return false;
    }
    if (!promiseToPayAccepted) {
        showAlert('Please confirm your promise to pay to continue.', 'error');
        return false;
    }

    if (!portalAccount.passwordSet || !portalAccount.username || !portalAccount.securityQuestion || !portalAccount.termsAccepted) {
        showAlert('Please complete Step 3 (Portal Setup) before submitting payment.', 'error');
        return false;
    }

    if (!entranceExam.completed) {
        showAlert('Please complete Step 4 (Entrance Exam) before submitting payment.', 'error');
        return false;
    }

    if (!enrollmentData.agreement?.accepted) {
        showAlert('Please complete Step 5 (Agreement) before submitting payment.', 'error');
        return false;
    }

    const financeSnapshot = updateFinanceCalculator() || enrollmentData.financeDetails;

    enrollmentData.paymentInfo = {
        cardName,
        cardLast4: cardNumber.slice(-4),
        expiry,
        billingZip,
        authorizationName,
        authorizationDate,
        authorizationSignatureImage,
        autoPay,
        authorized,
        methodFullPayment,
        methodRegFeeStart,
        methodRegFeeGraduation,
        noRefundChargebackAccepted,
        promiseToPayAccepted
    };
    enrollmentData.financeDetails = financeSnapshot;
    updatePaymentSignatureStatus(true);
    saveEnrollmentData();

    showAlert('Payment saved. Building your milestone tracker.', 'success');
    setTimeout(function () {
        populateMilestones();
        goToStep(5, 7);
    }, 700);
    return true;
}

function updateEnrollmentSummary() {
    const registration = enrollmentData.registration || {};
    const paymentPlan = enrollmentData.paymentPlan || {};

    const nameEl = document.getElementById('summary-name');
    const emailEl = document.getElementById('summary-email');
    const phoneEl = document.getElementById('summary-phone');
    const addressEl = document.getElementById('summary-address');
    const paymentEl = document.getElementById('summary-payment');
    const dateEl = document.getElementById('summary-date');

    const street = (registration.street || '').trim();
    const city = (registration.city || '').trim();
    const state = (registration.state || '').trim();
    const zip = (registration.zip || '').trim();
    const locationLine = [city, state, zip].filter(Boolean).join(' ');
    const fullAddress = street && locationLine
        ? `${street}, ${locationLine}`
        : street || locationLine || '-';

    if (nameEl) nameEl.textContent = getRegistrationFullName() || '-';
    if (emailEl) emailEl.textContent = registration.email || '-';
    if (phoneEl) phoneEl.textContent = registration.phone || '-';
    if (addressEl) addressEl.textContent = fullAddress;
    if (paymentEl) paymentEl.textContent = paymentPlan.name || '-';
    if (dateEl) {
        const dateSource = enrollmentData.agreement.signedAt || new Date().toISOString();
        dateEl.textContent = formatDate(new Date(dateSource));
    }
}

function restoreMilestoneChecks() {
    document.querySelectorAll('.milestone-check').forEach((checkbox) => {
        const checked = Boolean(enrollmentData.milestones[checkbox.id]);
        checkbox.checked = checked;
        checkbox.closest('.milestone-card')?.classList.toggle('completed', checked);
    });
}

function persistTermEvaluation(termKey, updates) {
    if (!termKey) return;
    enrollmentData.termEvaluations = {
        ...(enrollmentData.termEvaluations || {}),
        [termKey]: {
            ...(enrollmentData.termEvaluations?.[termKey] || {}),
            ...updates
        }
    };
    saveEnrollmentData();
}

function saveTermEvaluation(termKey) {
    if (!termKey) return;
    const select = document.querySelector(`[data-term-evaluation="${termKey}"]`);
    const completeCheckbox = document.querySelector(`[data-term-evaluation-complete="${termKey}"]`);
    const uploadInput = document.querySelector(`[data-term-evaluation-upload="${termKey}"]`);

    if (!select || !completeCheckbox || !uploadInput) {
        showAlert('Unable to save this program evaluation. Please refresh and try again.', 'error');
        return;
    }

    const fileName = uploadInput.files && uploadInput.files.length
        ? uploadInput.files[0].name
        : (enrollmentData.termEvaluations?.[termKey]?.uploadedFileName || '');

    const uploadNameLabel = document.querySelector(`[data-term-evaluation-upload-name="${termKey}"]`);
    if (uploadNameLabel) {
        uploadNameLabel.textContent = fileName ? `Uploaded: ${fileName}` : 'No file uploaded yet.';
    }

    persistTermEvaluation(termKey, {
        selectedEvaluation: select.value,
        completed: completeCheckbox.checked,
        uploadedFileName: fileName
    });

    showAlert(`Program evaluation saved for ${termKey.replace('-eval1', '').toUpperCase()}.`, 'success');
}

function persistMilestoneScheduleDate(fieldId, dateValue) {
    if (!fieldId) return;
    enrollmentData.milestoneSchedules = {
        ...(enrollmentData.milestoneSchedules || {}),
        [fieldId]: dateValue || ''
    };
    saveEnrollmentData();
}

function restoreMilestoneScheduleDates() {
    const scheduleData = enrollmentData.milestoneSchedules || {};
    ['background-check-date', 'cpr-course-date', 'physical-exam-date'].forEach((fieldId) => {
        const input = document.getElementById(fieldId);
        if (input) input.value = scheduleData[fieldId] || '';
    });
}

function submitMilestoneScheduleRequest(requestType, dateFieldId) {
    const requestName = (requestType || '').trim();
    const dateInput = document.getElementById(dateFieldId);
    const dateValue = dateInput?.value || '';

    if (!requestName || !dateFieldId || !dateInput) {
        showAlert('Unable to submit this request right now. Please refresh and try again.', 'error');
        return;
    }

    if (!dateValue) {
        showAlert('Please select a calendar date before submitting your request.', 'error');
        return;
    }

    const studentName = getRegistrationFullName() || 'Student Name Not Provided';
    const studentEmail = (enrollmentData.registration?.email || '').trim() || 'N/A';
    const studentPhone = (enrollmentData.registration?.phone || '').trim() || 'N/A';
    const requestedDateText = formatDate(new Date(`${dateValue}T00:00:00`));

    persistMilestoneScheduleDate(dateFieldId, dateValue);

    enrollmentData.milestoneScheduleRequests = {
        ...(enrollmentData.milestoneScheduleRequests || {}),
        [dateFieldId]: {
            requestType: requestName,
            requestedDate: dateValue,
            submittedAt: new Date().toISOString(),
            studentName,
            studentEmail,
            studentPhone
        }
    };
    saveEnrollmentData();

    const subject = `Milestone Request: ${requestName} - ${studentName}`;
    const bodyLines = [
        'Milestone Scheduling Request',
        '',
        `Student Name: ${studentName}`,
        `Student Email: ${studentEmail}`,
        `Student Phone: ${studentPhone}`,
        `Request Desired: ${requestName}`,
        `Calendar Date Requested: ${requestedDateText}`,
        '',
        'Please confirm appointment availability.'
    ];
    const mailtoUrl = `mailto:support@browardmiamihi.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

    window.location.href = mailtoUrl;
    showAlert(`${requestName} request prepared for ${requestedDateText}. Please send the email notification to complete submission.`, 'success');
}

function restoreTermEvaluationFields() {
    const termEvaluations = enrollmentData.termEvaluations || {};

    document.querySelectorAll('[data-term-evaluation]').forEach((select) => {
        const termKey = select.getAttribute('data-term-evaluation');
        const selectedValue = termEvaluations[termKey]?.selectedEvaluation || '';
        select.value = selectedValue;
    });

    document.querySelectorAll('[data-term-evaluation-complete]').forEach((checkbox) => {
        const termKey = checkbox.getAttribute('data-term-evaluation-complete');
        checkbox.checked = Boolean(termEvaluations[termKey]?.completed);
    });

    document.querySelectorAll('[data-term-evaluation-upload-name]').forEach((label) => {
        const termKey = label.getAttribute('data-term-evaluation-upload-name');
        const fileName = (termEvaluations[termKey]?.uploadedFileName || '').trim();
        label.textContent = fileName ? `Uploaded: ${fileName}` : 'No file uploaded yet.';
    });
}

function updateMilestoneProgress() {
    const progressTargets = [
        {
            textId: 'milestone-progress-text',
            barId: 'milestone-progress-bar',
            sectionSelector: '#step-5-tracker-content'
        },
        {
            textId: 'acceptance-progress-text',
            barId: 'acceptance-progress-bar',
            sectionSelector: '#step-5-acceptance-content'
        }
    ];

    progressTargets.forEach((target) => {
        const section = document.querySelector(target.sectionSelector);
        const checkboxes = section ? Array.from(section.querySelectorAll('.milestone-check')) : [];
        const total = checkboxes.length;
        const completed = checkboxes.filter((checkbox) => checkbox.checked).length;
        const percent = total ? Math.round((completed / total) * 100) : 0;

        const progressText = document.getElementById(target.textId);
        const progressBar = document.getElementById(target.barId);
        if (progressText) progressText.textContent = `${completed} of ${total} completed`;
        if (progressBar) progressBar.style.width = `${percent}%`;
    });
}

function populateMilestones() {
    updateEnrollmentSummary();
    restoreInstitutionRepFields();
    restoreMilestoneChecks();
    restoreTermEvaluationFields();
    updateMilestoneProgress();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function downloadEnrollmentConfirmation() {
    const registration = enrollmentData.registration;
    const paymentPlan = enrollmentData.paymentPlan;
    const paymentInfo = enrollmentData.paymentInfo;
    const financeDetails = enrollmentData.financeDetails || {};
    const portalAccount = enrollmentData.portalAccount || {};
    const authorizationDateText = paymentInfo.authorizationDate
        ? formatDate(new Date(`${paymentInfo.authorizationDate}T12:00:00`))
        : 'N/A';
    const selectedPaymentMethods = [
        paymentInfo.methodFullPayment ? 'Full payment at signing' : '',
        paymentInfo.methodRegFeeStart ? 'Registration fee at signing, balance before start date' : '',
        paymentInfo.methodRegFeeGraduation ? 'Registration fee at signing, balance before graduation' : ''
    ].filter(Boolean).join('; ') || 'N/A';

    if (!registration?.firstName || !paymentPlan || !paymentInfo.cardLast4) {
        showAlert('Complete registration and payment before downloading confirmation.', 'warning');
        return;
    }

    const content = `
ENROLLMENT CONFIRMATION
Practical Nursing Program

========================================
STUDENT INFORMATION
========================================
Name: ${registration.firstName} ${registration.lastName}
Email: ${registration.email}
Phone: ${registration.phone}
Date of Birth: ${registration.dob}
Preferred Start Term: ${registration.startTerm}
How did you hear about us: ${registration.hearAboutUs}

Address:
${registration.street}
${registration.city}, ${registration.state} ${registration.zip}

========================================
PAYMENT INFORMATION
========================================
Payment Plan: ${paymentPlan.name}
Total Amount: ${formatCurrency(paymentPlan.totalAmount)}
Plan Fee: ${formatCurrency(paymentPlan.fee)}
Card Ending In: ****${paymentInfo.cardLast4}
AutoPay Enabled: ${paymentInfo.autoPay ? 'Yes' : 'No'}
Selected Methods Of Payment: ${selectedPaymentMethods}
No Refund/Chargeback Accepted: ${paymentInfo.noRefundChargebackAccepted ? 'Yes' : 'No'}
Promise To Pay Accepted: ${paymentInfo.promiseToPayAccepted ? 'Yes' : 'No'}
Authorized Name: ${paymentInfo.authorizationName || 'N/A'}
Authorization Date: ${authorizationDateText}
Payment Signature Saved: ${paymentInfo.authorizationSignatureImage ? 'Yes' : 'No'}
APR: ${financeDetails.apr ? `${parsePositiveNumber(financeDetails.apr).toFixed(2)}%` : '0.00%'}
Finance Charge: ${formatCurrency(financeDetails.financeCharge || 0)}
Amount Financed: ${formatCurrency(financeDetails.amountFinanced || 0)}
Total Of Payment: ${formatCurrency(financeDetails.totalOfPayment || 0)}
Total Sales Price: ${formatCurrency(financeDetails.totalSalesPrice || 0)}
Portal Account Created: ${portalAccount.passwordSet ? 'Yes' : 'No'}
Portal Username: ${portalAccount.username || 'N/A'}

========================================
ENROLLMENT DATE
========================================
${formatDate(new Date())}
`.trim();

    downloadPdfFromText(content, 'enrollment-confirmation.pdf');
}

function downloadPaymentSchedule() {
    const paymentPlan = enrollmentData.paymentPlan;
    if (!paymentPlan?.schedule?.length) {
        showAlert('Please choose a payment plan first.', 'warning');
        return;
    }

    const lines = paymentPlan.schedule.map(
        (entry) => `${entry.label.padEnd(26)} ${formatCurrency(entry.amount).padEnd(10)} ${formatDate(new Date(entry.dueDate))}`
    );

    const content = `
PAYMENT SCHEDULE
Practical Nursing Program

Payment Plan: ${paymentPlan.name}
Total Cost: ${formatCurrency(paymentPlan.totalAmount)}
Plan Fee: ${formatCurrency(paymentPlan.fee)}

========================================
PAYMENT BREAKDOWN
========================================
${lines.join('\n')}
`.trim();

    downloadPdfFromText(content, 'payment-schedule.pdf');
}

function downloadAcceptanceLetter() {
    const registration = enrollmentData.registration || {};
    const fullName = `${registration.firstName || ''} ${registration.lastName || ''}`.trim();
    const preferredStartTerm = registration.startTerm || 'To Be Determined';
    const letterDate = formatDate(new Date());

    if (!fullName) {
        showAlert('Please complete student registration before downloading the acceptance letter.', 'warning');
        return;
    }

    const safeName = fullName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'student';

    const content = `
Date: ${letterDate}

Dear ${fullName},

Congratulations. You are officially accepted into the Practical Nursing Program at Broward-Miami Health Institute.

Student Name: ${fullName}
Program: Practical Nursing Program
Preferred Start Term: ${preferredStartTerm}
Email: ${registration.email || 'N/A'}
Phone: ${registration.phone || 'N/A'}

Please keep this letter for your records and complete any remaining acceptance and pre-program milestones in your enrollment portal.

Sincerely,
Admissions Office
Broward-Miami Health Institute
`.trim();

    downloadPdfFromText(content, `acceptance-letter-${safeName}.pdf`, 'Acceptance Letter');
}

function downloadAgreement() {
    const agreementText = document.querySelector('.agreement-document')?.innerText || '';
    const signedName = enrollmentData.agreement.signedBy || getRegistrationFullName() || 'N/A';
    const signedDate = enrollmentData.agreement.signedAt
        ? formatDate(new Date(enrollmentData.agreement.signedAt))
        : formatDate(new Date());

    const content = `
${agreementText}

========================================
STUDENT ACKNOWLEDGMENT
========================================
Name (Printed): ${signedName}
Date: ${signedDate}
Digital Signature Saved: ${enrollmentData.signature ? 'Yes' : 'No'}
`.trim();

    downloadPdfFromText(content, 'enrollment-agreement.pdf');
}

function normalizePdfText(text) {
    return String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[–—]/g, '-')
        .replace(/\t/g, '    ');
}

function wrapPdfLine(line, maxChars) {
    if (!line) return [''];
    if (line.length <= maxChars) return [line];
    const words = line.split(/\s+/);
    const wrapped = [];
    let current = '';
    words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxChars) {
            if (current) wrapped.push(current);
            current = word;
        } else {
            current = candidate;
        }
    });
    if (current) wrapped.push(current);
    return wrapped;
}

function escapePdfText(value) {
    return String(value || '')
        .replace(/[^\x20-\x7E]/g, '?')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
}

function getPdfDocumentTitle(lines, titleOverride) {
    const override = String(titleOverride || '').trim();
    if (override) return override;
    const title = (lines || []).find((line) => {
        const trimmed = String(line || '').trim();
        return trimmed && !/^=+$/.test(trimmed);
    });
    return title || 'Enrollment Document';
}

function loadImageElementForPdf(src) {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = function () { resolve(image); };
        image.onerror = function () { resolve(null); };
        image.src = src;
    });
}

function dataUrlToPdfHex(dataUrl) {
    const match = String(dataUrl || '').match(/^data:image\/jpeg;base64,(.+)$/);
    if (!match) return null;
    const base64 = match[1];
    const binary = atob(base64);
    let hex = '';
    for (let i = 0; i < binary.length; i += 1) {
        hex += binary.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase();
    }
    return hex;
}

function imageElementToPdfAsset(image, maxWidth, maxHeight, quality) {
    if (!image || typeof document === 'undefined') return null;
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality || 0.92);
    const hex = dataUrlToPdfHex(dataUrl);
    if (!hex) return null;

    return { width, height, hex };
}

function buildPdfImageObject(asset) {
    const streamData = `${asset.hex}>`;
    const streamLength = new TextEncoder().encode(streamData).length;
    return `<< /Type /XObject /Subtype /Image /Width ${asset.width} /Height ${asset.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${streamLength} >>\nstream\n${streamData}\nendstream`;
}

function getPdfLogoAssets() {
    if (pdfLogoAssetsPromise) return pdfLogoAssetsPromise;

    pdfLogoAssetsPromise = Promise.all([
        loadImageElementForPdf(PDF_HEADER_LOGO_PATH),
        loadImageElementForPdf(PDF_FOOTER_LOGO_PATH)
    ]).then(([headerImage, footerImage]) => {
        const headerAsset = imageElementToPdfAsset(headerImage, 260, 56, 1);
        const footerAsset = imageElementToPdfAsset(footerImage, 96, 26, 1);
        const resolvedHeader = headerAsset || footerAsset || null;
        const resolvedFooter = footerAsset || headerAsset || null;
        if (!resolvedHeader && !resolvedFooter) return null;
        return { header: resolvedHeader, footer: resolvedFooter };
    }).catch(() => null);

    return pdfLogoAssetsPromise;
}

function buildPdfContentStream(lines, pageNumber, totalPages, documentTitle, logoLayout) {
    const bodyStartY = 708;
    const footerY = 32;
    const lineHeight = 14;
    let y = bodyStartY;
    const isAcceptanceLetter = String(documentTitle || '').toLowerCase() === 'acceptance letter';
    const generatedOn = formatDate(new Date());
    const schoolName = 'BROWARD-MIAMI HEALTH INSTITUTE';
    const schoolAddress = '6320 Miramar Pkwy Suite I, Miramar, FL 33023';
    const schoolContact = 'Tel: (954) 248-0669 | support@browardmiamihi.com';
    const footerLeft = `Generated on ${generatedOn}`;
    const footerRight = `Page ${pageNumber} of ${totalPages}`;
    const headerScale = isAcceptanceLetter ? 0.5 : 1;
    const headerWidth = logoLayout?.header ? Math.max(1, Math.round(logoLayout.header.width * headerScale)) : 0;
    const headerHeight = logoLayout?.header ? Math.max(1, Math.round(logoLayout.header.height * headerScale)) : 0;
    const headerX = logoLayout?.header ? Math.max(54, 558 - headerWidth) : 390;
    const footerLogoX = logoLayout?.footer ? Math.max(54, 558 - logoLayout.footer.width) : 468;
    const headerY = isAcceptanceLetter ? 770 : 738;
    const footerLogoY = 16;

    const streamParts = [
        '0.8 w',
        '54 736 m 558 736 l S',
        '54 48 m 558 48 l S',
        logoLayout?.header ? 'q' : '',
        logoLayout?.header ? `${headerWidth} 0 0 ${headerHeight} ${headerX} ${headerY} cm` : '',
        logoLayout?.header ? '/HL Do' : '',
        logoLayout?.header ? 'Q' : '',
        logoLayout?.footer ? 'q' : '',
        logoLayout?.footer ? `${logoLayout.footer.width} 0 0 ${logoLayout.footer.height} ${footerLogoX} ${footerLogoY} cm` : '',
        logoLayout?.footer ? '/FL Do' : '',
        logoLayout?.footer ? 'Q' : '',
        'BT',
        '/F1 15 Tf',
        '1 0 0 1 54 770 Tm',
        `(${escapePdfText(schoolName)}) Tj`,
        '/F1 9 Tf',
        '1 0 0 1 54 756 Tm',
        `(${escapePdfText(schoolAddress)}) Tj`,
        '1 0 0 1 54 744 Tm',
        `(${escapePdfText(schoolContact)}) Tj`,
        '/F1 12 Tf',
        '1 0 0 1 54 722 Tm',
        `(${escapePdfText(documentTitle)}) Tj`,
        '/F1 11 Tf'
    ];

    lines.forEach((line) => {
        streamParts.push(`1 0 0 1 54 ${y} Tm`);
        streamParts.push(`(${escapePdfText(line)}) Tj`);
        y -= lineHeight;
    });

    streamParts.push('/F1 9 Tf');
    streamParts.push(`1 0 0 1 54 ${footerY} Tm`);
    streamParts.push(`(${escapePdfText(footerLeft)}) Tj`);
    streamParts.push(`1 0 0 1 470 ${footerY} Tm`);
    streamParts.push(`(${escapePdfText(footerRight)}) Tj`);
    streamParts.push('ET');
    return streamParts.filter(Boolean).join('\n');
}

function createPdfBlobFromText(content, logoAssets, titleOverride) {
    const normalized = normalizePdfText(content);
    const rawLines = normalized.split('\n').map((line) => line.trimEnd());
    const documentTitle = getPdfDocumentTitle(rawLines, titleOverride);
    const wrappedLines = rawLines.flatMap((line) => wrapPdfLine(line, 96));
    const lines = wrappedLines.length ? wrappedLines : [''];
    const linesPerPage = 43;
    const pages = [];
    for (let i = 0; i < lines.length; i += linesPerPage) {
        pages.push(lines.slice(i, i + linesPerPage));
    }

    const firstPageObj = 3;
    const fontObjNumber = firstPageObj + (pages.length * 2);
    let nextObjNumber = fontObjNumber + 1;
    const headerLogoObj = logoAssets?.header ? nextObjNumber++ : null;
    const footerLogoObj = logoAssets?.footer ? nextObjNumber++ : null;
    const objectCount = nextObjNumber - 1;
    const objects = new Array(objectCount + 1);
    const pageRefs = [];
    const logoLayout = {
        header: headerLogoObj ? { width: logoAssets.header.width, height: logoAssets.header.height } : null,
        footer: footerLogoObj ? { width: logoAssets.footer.width, height: logoAssets.footer.height } : null
    };

    pages.forEach((pageLines, index) => {
        const pageObj = firstPageObj + (index * 2);
        const contentObj = pageObj + 1;
        const stream = buildPdfContentStream(pageLines, index + 1, pages.length, documentTitle, logoLayout);
        const streamLength = new TextEncoder().encode(stream).length;
        const xObjectRefs = [];
        if (headerLogoObj) xObjectRefs.push(`/HL ${headerLogoObj} 0 R`);
        if (footerLogoObj) xObjectRefs.push(`/FL ${footerLogoObj} 0 R`);
        const xObjectSection = xObjectRefs.length ? ` /XObject << ${xObjectRefs.join(' ')} >>` : '';

        objects[contentObj] = `<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`;
        objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjNumber} 0 R >>${xObjectSection} >> /Contents ${contentObj} 0 R >>`;
        pageRefs.push(`${pageObj} 0 R`);
    });

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;
    objects[fontObjNumber] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    if (headerLogoObj) objects[headerLogoObj] = buildPdfImageObject(logoAssets.header);
    if (footerLogoObj) objects[footerLogoObj] = buildPdfImageObject(logoAssets.footer);

    let pdf = '%PDF-1.4\n';
    const offsets = new Array(objectCount + 1).fill(0);

    for (let i = 1; i <= objectCount; i += 1) {
        offsets[i] = new TextEncoder().encode(pdf).length;
        pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const xrefStart = new TextEncoder().encode(pdf).length;
    pdf += `xref\n0 ${objectCount + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objectCount; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
}

function downloadPdfFromText(content, filename, titleOverride) {
    getPdfLogoAssets()
        .then((logoAssets) => {
            const blob = createPdfBlobFromText(content, logoAssets, titleOverride);
            downloadBlob(blob, filename);
        })
        .catch(() => {
            const blob = createPdfBlobFromText(content, null, titleOverride);
            downloadBlob(blob, filename);
        });
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
}

function completeEnrollment() {
    showAlert('Enrollment completed. Download your documents for your records.', 'success');
}

function resetEnrollment() {
    const confirmed = window.confirm('Start a new enrollment? This will clear all saved data for this browser.');
    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    enrollmentData = getDefaultEnrollmentData();

    document.getElementById('registration-form')?.reset();
    ['card-name', 'card-number', 'expiry', 'cvv', 'billing-zip', 'payment-authorization-name', 'payment-authorization-date', 'finance-apr', 'finance-down-payment', 'finance-begin-date', 'portal-username', 'portal-password', 'portal-confirm-password', 'portal-security-answer', 'exam-center', 'exam-type', 'exam-date', 'exam-time', 'exam-access-code', 'exam-first-name', 'exam-last-name', 'exam-email', 'exam-text-phone', 'exam-degree-level', 'exam-prior-score-upload', 'exam-degree-proof-upload', 'background-check-date', 'cpr-course-date', 'physical-exam-date', 'initial-1', 'initial-2', 'initial-3', 'initial-4', 'initial-5']
        .forEach((id) => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
    ['auto-pay-checkbox', 'payment-authorize-checkbox', 'method-full-payment', 'method-reg-fee-start', 'method-reg-fee-graduation', 'no-refund-chargeback-checkbox', 'promise-to-pay-checkbox', 'portal-terms-checkbox', 'exam-terms-checkbox', 'exam-prior-score-checkbox', 'exam-degree-waiver-checkbox']
        .forEach((id) => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });
    const financeFrequency = document.getElementById('finance-frequency');
    if (financeFrequency) financeFrequency.value = 'monthly';
    const portalQuestion = document.getElementById('portal-security-question');
    if (portalQuestion) portalQuestion.value = '';
    document.querySelectorAll('input[name="payment-plan"]').forEach((radio) => {
        radio.checked = false;
    });
    document.querySelectorAll('.payment-plan-card').forEach((card) => {
        card.classList.remove('selected');
    });
    document.querySelectorAll('.milestone-check').forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.closest('.milestone-card')?.classList.remove('completed');
    });
    document.querySelectorAll('[data-term-evaluation]').forEach((select) => {
        select.value = '';
    });
    document.querySelectorAll('[data-term-evaluation-complete]').forEach((checkbox) => {
        checkbox.checked = false;
    });
    document.querySelectorAll('[data-term-evaluation-upload]').forEach((input) => {
        input.value = '';
    });
    document.querySelectorAll('[data-term-evaluation-upload-name]').forEach((label) => {
        label.textContent = 'No file uploaded yet.';
    });
    const priorScoreUploadName = document.getElementById('exam-prior-score-upload-name');
    if (priorScoreUploadName) priorScoreUploadName.textContent = 'No file uploaded yet.';
    const degreeProofUploadName = document.getElementById('exam-degree-proof-upload-name');
    if (degreeProofUploadName) degreeProofUploadName.textContent = 'No file uploaded yet.';

    const breakdownBody = document.getElementById('breakdown-body');
    if (breakdownBody) {
        breakdownBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#999;">Select a payment plan above</td></tr>';
    }
    updateFinanceCalculator(null);

    clearSignature();
    clearPaymentSignature();
    updateSignatureDetails('', '');
    restoreInstitutionRepFields();
    updateEnrollmentSummary();
    updateMilestoneProgress();
    goToStep(1);
    showAlert('A new enrollment session has started.', 'success');
}

function saveEnrollmentData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(enrollmentData));
    } catch (error) {
        console.error('Failed to save enrollment data:', error);
        showAlert('Unable to save changes in browser storage.', 'warning');
    }
}

function mergeEnrollmentData(savedData) {
    const defaults = getDefaultEnrollmentData();
    return {
        ...defaults,
        ...savedData,
        registration: { ...defaults.registration, ...(savedData.registration || {}) },
        entranceExam: { ...defaults.entranceExam, ...(savedData.entranceExam || {}) },
        agreement: { ...defaults.agreement, ...(savedData.agreement || {}) },
        paymentInfo: { ...defaults.paymentInfo, ...(savedData.paymentInfo || {}) },
        financeDetails: { ...defaults.financeDetails, ...(savedData.financeDetails || {}) },
        institutionRep: { ...defaults.institutionRep, ...(savedData.institutionRep || {}) },
        portalAccount: { ...defaults.portalAccount, ...(savedData.portalAccount || {}) },
        milestones: { ...(savedData.milestones || {}) },
        termEvaluations: { ...(savedData.termEvaluations || {}) },
        milestoneSchedules: { ...(savedData.milestoneSchedules || {}) },
        milestoneScheduleRequests: { ...(savedData.milestoneScheduleRequests || {}) }
    };
}

function loadEnrollmentData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return;
        enrollmentData = mergeEnrollmentData(JSON.parse(savedData));
    } catch (error) {
        console.error('Failed to load enrollment data:', error);
        enrollmentData = getDefaultEnrollmentData();
    }
}

function restoreRegistrationFields() {
    const registration = enrollmentData.registration || {};
    Object.keys(registration).forEach((key) => {
        const field = document.getElementById(key);
        if (field) field.value = registration[key];
    });
}

function restoreEntranceExamFields() {
    const exam = enrollmentData.entranceExam || {};
    const registration = enrollmentData.registration || {};
    const setValue = (id, value) => {
        const field = document.getElementById(id);
        if (field) field.value = value || '';
    };

    setValue('exam-center', exam.center || '');
    setValue('exam-type', exam.examType || '');
    setValue('exam-date', exam.examDate || '');
    setValue('exam-time', exam.examTime || '');
    setValue('exam-access-code', '');
    setValue('exam-first-name', exam.firstName || registration.firstName || '');
    setValue('exam-last-name', exam.lastName || registration.lastName || '');
    setValue('exam-email', exam.email || registration.email || '');
    setValue('exam-text-phone', exam.textPhone || registration.phone || '');
    setValue('exam-degree-level', exam.degreeLevel || '');
    const examTerms = document.getElementById('exam-terms-checkbox');
    if (examTerms) examTerms.checked = Boolean(exam.termsAccepted);
    const priorScoreSubmitted = document.getElementById('exam-prior-score-checkbox');
    if (priorScoreSubmitted) priorScoreSubmitted.checked = Boolean(exam.priorScoreSubmitted);
    const degreeWaiverRequested = document.getElementById('exam-degree-waiver-checkbox');
    if (degreeWaiverRequested) degreeWaiverRequested.checked = Boolean(exam.degreeWaiverRequested);
    const priorScoreUploadName = document.getElementById('exam-prior-score-upload-name');
    if (priorScoreUploadName) {
        priorScoreUploadName.textContent = exam.priorScoreFileName ? `Uploaded: ${exam.priorScoreFileName}` : 'No file uploaded yet.';
    }
    const degreeProofUploadName = document.getElementById('exam-degree-proof-upload-name');
    if (degreeProofUploadName) {
        degreeProofUploadName.textContent = exam.degreeProofFileName ? `Uploaded: ${exam.degreeProofFileName}` : 'No file uploaded yet.';
    }
}

function restoreAgreementInitials(initialsData) {
    READ_SIGN_STATEMENT_IDS.forEach((id) => {
        const input = document.getElementById(id);
        const entry = initialsData?.[id] || '';
        const initialValue = typeof entry === 'string' ? entry : entry.initials || '';
        if (input) input.value = initialValue;
    });
}

function restoreAgreementFields() {
    const agreement = enrollmentData.agreement || {};
    const agreementCheckbox = document.getElementById('agree-checkbox');
    const agreementName = document.getElementById('agreementFullName');
    const defaultName = agreement.signedBy || getRegistrationFullName();
    const defaultDateIso = agreement.signedAt || new Date().toISOString();
    if (agreementCheckbox) agreementCheckbox.checked = Boolean(agreement.accepted);
    if (agreementName) agreementName.value = defaultName;
    restoreAgreementInitials(agreement.statementInitials || {});
    updateSignatureDetails(defaultName, defaultDateIso);
    if (enrollmentData.signature) restoreSignature(enrollmentData.signature);
}

function restorePaymentFields() {
    const payment = enrollmentData.paymentInfo || {};
    const portal = enrollmentData.portalAccount || {};
    const cardName = document.getElementById('card-name');
    const expiry = document.getElementById('expiry');
    const billingZip = document.getElementById('billing-zip');
    const paymentAuthorizationName = document.getElementById('payment-authorization-name');
    const paymentAuthorizationDate = document.getElementById('payment-authorization-date');
    const autoPay = document.getElementById('auto-pay-checkbox');
    const authorize = document.getElementById('payment-authorize-checkbox');
    const methodFullPayment = document.getElementById('method-full-payment');
    const methodRegFeeStart = document.getElementById('method-reg-fee-start');
    const methodRegFeeGraduation = document.getElementById('method-reg-fee-graduation');
    const noRefundChargeback = document.getElementById('no-refund-chargeback-checkbox');
    const promiseToPay = document.getElementById('promise-to-pay-checkbox');
    const portalUsername = document.getElementById('portal-username');
    const portalSecurityQuestion = document.getElementById('portal-security-question');
    const portalTerms = document.getElementById('portal-terms-checkbox');
    const portalPassword = document.getElementById('portal-password');
    const portalConfirmPassword = document.getElementById('portal-confirm-password');
    const portalSecurityAnswer = document.getElementById('portal-security-answer');
    const registrationName = getRegistrationFullName();
    const todayIso = new Date().toISOString().slice(0, 10);
    if (cardName) cardName.value = payment.cardName || '';
    if (expiry) expiry.value = payment.expiry || '';
    if (billingZip) billingZip.value = payment.billingZip || '';
    if (paymentAuthorizationName) paymentAuthorizationName.value = payment.authorizationName || registrationName || '';
    if (paymentAuthorizationDate) paymentAuthorizationDate.value = payment.authorizationDate || todayIso;
    restorePaymentSignature(payment.authorizationSignatureImage || '');
    if (autoPay) autoPay.checked = Boolean(payment.autoPay);
    if (authorize) authorize.checked = Boolean(payment.authorized);
    if (methodFullPayment) methodFullPayment.checked = Boolean(payment.methodFullPayment);
    if (methodRegFeeStart) methodRegFeeStart.checked = Boolean(payment.methodRegFeeStart);
    if (methodRegFeeGraduation) methodRegFeeGraduation.checked = Boolean(payment.methodRegFeeGraduation);
    if (noRefundChargeback) noRefundChargeback.checked = Boolean(payment.noRefundChargebackAccepted);
    if (promiseToPay) promiseToPay.checked = Boolean(payment.promiseToPayAccepted);
    if (portalUsername) portalUsername.value = portal.username || '';
    if (portalSecurityQuestion) portalSecurityQuestion.value = portal.securityQuestion || '';
    if (portalTerms) portalTerms.checked = Boolean(portal.termsAccepted);
    if (portalPassword) portalPassword.value = '';
    if (portalConfirmPassword) portalConfirmPassword.value = '';
    if (portalSecurityAnswer) portalSecurityAnswer.value = '';
}

function restoreFinanceFields() {
    const finance = enrollmentData.financeDetails || {};
    const aprInput = document.getElementById('finance-apr');
    const downPaymentInput = document.getElementById('finance-down-payment');
    const beginDateInput = document.getElementById('finance-begin-date');
    const frequencyInput = document.getElementById('finance-frequency');

    if (aprInput) aprInput.value = finance.apr || '';
    if (downPaymentInput) downPaymentInput.value = finance.downPayment || '';
    if (beginDateInput) beginDateInput.value = finance.beginDate || '';
    if (frequencyInput) frequencyInput.value = finance.frequency || 'monthly';

    updateFinanceCalculator();
}

function getInstitutionRepFormData() {
    const selectedGender = document.querySelector('input[name="inst-gender"]:checked')?.value || '';
    return {
        ssn: (document.getElementById('inst-ssn')?.value || '').trim(),
        dob: document.getElementById('inst-dob')?.value || '',
        gender: selectedGender,
        programTitle: (document.getElementById('inst-program-title')?.value || '').trim(),
        clockHours: (document.getElementById('inst-clock-hours')?.value || '').trim(),
        weeks: (document.getElementById('inst-weeks')?.value || '').trim(),
        fullTime: Boolean(document.getElementById('inst-full-time')?.checked),
        partTime: Boolean(document.getElementById('inst-part-time')?.checked),
        dayClasses: Boolean(document.getElementById('inst-day-classes')?.checked),
        eveningClasses: Boolean(document.getElementById('inst-evening-classes')?.checked),
        hoursPerWeek: (document.getElementById('inst-hours-per-week')?.value || '').trim(),
        startDate: document.getElementById('inst-start-date')?.value || '',
        anticipatedEndDate: document.getElementById('inst-anticipated-end-date')?.value || '',
        tuition: (document.getElementById('inst-tuition')?.value || '').trim(),
        registrationFee: (document.getElementById('inst-registration-fee')?.value || '').trim(),
        books: (document.getElementById('inst-books')?.value || '').trim(),
        materials: (document.getElementById('inst-materials')?.value || '').trim(),
        backgroundCheck: (document.getElementById('inst-background-check')?.value || '').trim(),
        totalProgramCost: (document.getElementById('inst-total-program-cost')?.value || '').trim()
    };
}

function restoreInstitutionRepFields() {
    const rep = enrollmentData.institutionRep || {};
    const registration = enrollmentData.registration || {};
    const setValue = (id, value) => {
        const field = document.getElementById(id);
        if (field) field.value = value || '';
    };
    const setChecked = (id, checked) => {
        const field = document.getElementById(id);
        if (field) field.checked = Boolean(checked);
    };

    setValue('inst-ssn', rep.ssn || (registration.ssn ? `***-**-${registration.ssn}` : ''));
    setValue('inst-dob', rep.dob || registration.dob || '');
    document.querySelectorAll('input[name="inst-gender"]').forEach((radio) => {
        radio.checked = radio.value === (rep.gender || '');
    });
    setValue('inst-program-title', rep.programTitle || 'Practical Nursing Program');
    setValue('inst-clock-hours', rep.clockHours || '');
    setValue('inst-weeks', rep.weeks || '');
    setChecked('inst-full-time', rep.fullTime);
    setChecked('inst-part-time', rep.partTime);
    setChecked('inst-day-classes', rep.dayClasses);
    setChecked('inst-evening-classes', rep.eveningClasses);
    setValue('inst-hours-per-week', rep.hoursPerWeek || '');
    setValue('inst-start-date', rep.startDate || '');
    setValue('inst-anticipated-end-date', rep.anticipatedEndDate || '');
    setValue('inst-tuition', rep.tuition || '');
    setValue('inst-registration-fee', rep.registrationFee || '');
    setValue('inst-books', rep.books || '');
    setValue('inst-materials', rep.materials || '');
    setValue('inst-background-check', rep.backgroundCheck || '');
    setValue('inst-total-program-cost', rep.totalProgramCost || String(BASE_PROGRAM_COST));
}

function restorePaymentSelection() {
    if (!enrollmentData.paymentPlan?.id) {
        renderPaymentBreakdown(null);
        updateFinanceCalculator(null);
        return;
    }

    const planId = enrollmentData.paymentPlan.id;
    const radio = document.getElementById(`plan${planId}`);
    if (radio) {
        radio.checked = true;
        radio.closest('.payment-plan-card')?.classList.add('selected');
    }
    renderPaymentBreakdown(enrollmentData.paymentPlan);
    updateFinanceCalculator(enrollmentData.paymentPlan);
}

function restoreUIFromData() {
    restoreRegistrationFields();
    restoreEntranceExamFields();
    restoreInstitutionRepFields();
    restoreAgreementFields();
    restorePaymentFields();
    restorePaymentSelection();
    restoreFinanceFields();
    restoreMilestoneChecks();
    restoreMilestoneScheduleDates();
    restoreTermEvaluationFields();
    updateEnrollmentSummary();
}

function formatPhoneNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function debounce(callback, delay) {
    let timer = null;
    return function () {
        const args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
            callback.apply(null, args);
        }, delay);
    };
}

function setupEventListeners() {
    document.querySelectorAll('.step-indicator .step').forEach((indicator) => {
        const processStep = Number.parseInt(indicator.id.replace('step-indicator-', ''), 10);
        if (Number.isNaN(processStep)) return;

        indicator.setAttribute('role', 'button');
        indicator.setAttribute('tabindex', '0');

        const goToHeaderStep = function () {
            const pageStep = getPageStepForProcess(processStep);
            goToStep(pageStep, processStep);
        };

        indicator.addEventListener('click', goToHeaderStep);
        indicator.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                goToHeaderStep();
            }
        });
    });

    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function () {
            this.value = formatCardNumberInput(this.value);
        });
    }

    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function () {
            const digits = this.value.replace(/\D/g, '').slice(0, 4);
            this.value = digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
        });
    }

    document.getElementById('cvv')?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
    document.getElementById('billing-zip')?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 5);
    });
    document.getElementById('portal-username')?.addEventListener('input', function () {
        this.value = this.value.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 20);
    });
    document.getElementById('phone')?.addEventListener('input', function () {
        this.value = formatPhoneNumber(this.value);
    });
    document.getElementById('exam-text-phone')?.addEventListener('input', function () {
        this.value = formatPhoneNumber(this.value);
    });
    ['background-check-date', 'cpr-course-date', 'physical-exam-date'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', function () {
            persistMilestoneScheduleDate(id, this.value || '');
        });
    });

    const persistEntranceExamAlternative = function (updates) {
        enrollmentData.entranceExam = {
            ...(enrollmentData.entranceExam || {}),
            ...updates
        };
        saveEnrollmentData();
    };

    const persistEntranceExamAlternativeSelections = function () {
        persistEntranceExamAlternative({
            priorScoreSubmitted: Boolean(document.getElementById('exam-prior-score-checkbox')?.checked),
            degreeWaiverRequested: Boolean(document.getElementById('exam-degree-waiver-checkbox')?.checked),
            degreeLevel: document.getElementById('exam-degree-level')?.value || ''
        });
    };

    ['exam-prior-score-checkbox', 'exam-degree-waiver-checkbox', 'exam-degree-level'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', persistEntranceExamAlternativeSelections);
    });

    document.getElementById('exam-prior-score-upload')?.addEventListener('change', function () {
        const fileName = this.files && this.files.length ? this.files[0].name : '';
        const uploadNameLabel = document.getElementById('exam-prior-score-upload-name');
        if (uploadNameLabel) {
            uploadNameLabel.textContent = fileName ? `Uploaded: ${fileName}` : 'No file uploaded yet.';
        }
        persistEntranceExamAlternative({ priorScoreFileName: fileName });
    });

    document.getElementById('exam-degree-proof-upload')?.addEventListener('change', function () {
        const fileName = this.files && this.files.length ? this.files[0].name : '';
        const uploadNameLabel = document.getElementById('exam-degree-proof-upload-name');
        if (uploadNameLabel) {
            uploadNameLabel.textContent = fileName ? `Uploaded: ${fileName}` : 'No file uploaded yet.';
        }
        persistEntranceExamAlternative({ degreeProofFileName: fileName });
    });
    document.getElementById('ssn')?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
    document.getElementById('zip')?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 5);
    });
    document.getElementById('state')?.addEventListener('input', function () {
        this.value = this.value.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase();
    });
    document.getElementById('inst-ssn')?.addEventListener('input', function () {
        const digits = this.value.replace(/\D/g, '').slice(0, 9);
        if (digits.length <= 3) {
            this.value = digits;
        } else if (digits.length <= 5) {
            this.value = `${digits.slice(0, 3)}-${digits.slice(3)}`;
        } else {
            this.value = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
        }
    });

    const persistPaymentMethodSelection = function () {
        enrollmentData.paymentInfo = {
            ...(enrollmentData.paymentInfo || {}),
            methodFullPayment: Boolean(document.getElementById('method-full-payment')?.checked),
            methodRegFeeStart: Boolean(document.getElementById('method-reg-fee-start')?.checked),
            methodRegFeeGraduation: Boolean(document.getElementById('method-reg-fee-graduation')?.checked)
        };
        saveEnrollmentData();
    };

    ['method-full-payment', 'method-reg-fee-start', 'method-reg-fee-graduation'].forEach((id) => {
        document.getElementById(id)?.addEventListener('change', persistPaymentMethodSelection);
    });

    const recalculateFinanceAndSave = function () {
        updateFinanceCalculator();
        saveEnrollmentData();
    };

    document.getElementById('finance-apr')?.addEventListener('input', recalculateFinanceAndSave);
    document.getElementById('finance-down-payment')?.addEventListener('input', recalculateFinanceAndSave);
    document.getElementById('finance-begin-date')?.addEventListener('change', recalculateFinanceAndSave);
    document.getElementById('finance-frequency')?.addEventListener('change', recalculateFinanceAndSave);

    const persistAgreementInitials = function () {
        enrollmentData.agreement = {
            ...(enrollmentData.agreement || {}),
            statementInitials: getAgreementInitialsFromForm()
        };
        saveEnrollmentData();
    };

    READ_SIGN_STATEMENT_IDS.forEach((id) => {
        const input = document.getElementById(id);

        if (input) {
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase();
                persistAgreementInitials();
            });
        }
    });

    const agreementNameInput = document.getElementById('agreementFullName');
    const signatureNameInput = document.getElementById('signature-name');
    const signatureDateInput = document.getElementById('signature-date');

    if (agreementNameInput) {
        agreementNameInput.addEventListener('input', function () {
            if (!signatureNameInput || signatureNameInput.matches(':focus')) return;
            signatureNameInput.value = this.value;
        });
    }

    if (signatureNameInput) {
        signatureNameInput.addEventListener('input', function () {
            if (!agreementNameInput || agreementNameInput.matches(':focus')) return;
            agreementNameInput.value = this.value;
        });
    }

    if (signatureDateInput) {
        signatureDateInput.addEventListener('change', function () {
            const selectedDateIso = getSelectedAgreementDateIso();
            if (!selectedDateIso) return;
            enrollmentData.agreement.signedAt = selectedDateIso;
            saveEnrollmentData();
        });
    }

    const updateInstitutionRep = function () {
        enrollmentData.institutionRep = getInstitutionRepFormData();
        saveEnrollmentData();
    };

    document.querySelectorAll('[data-institution-field]').forEach((field) => {
        field.addEventListener('input', updateInstitutionRep);
        field.addEventListener('change', updateInstitutionRep);
    });

    document.querySelectorAll('.milestone-check').forEach((checkbox) => {
        checkbox.addEventListener('change', function () {
            enrollmentData.milestones[this.id] = this.checked;
            this.closest('.milestone-card')?.classList.toggle('completed', this.checked);
            updateMilestoneProgress();
            saveEnrollmentData();
        });
    });

    document.querySelectorAll('[data-term-evaluation]').forEach((select) => {
        select.addEventListener('change', function () {
            const termKey = this.getAttribute('data-term-evaluation');
            persistTermEvaluation(termKey, { selectedEvaluation: this.value });
        });
    });

    document.querySelectorAll('[data-term-evaluation-complete]').forEach((checkbox) => {
        checkbox.addEventListener('change', function () {
            const termKey = this.getAttribute('data-term-evaluation-complete');
            persistTermEvaluation(termKey, { completed: this.checked });
        });
    });

    document.querySelectorAll('[data-term-evaluation-upload]').forEach((input) => {
        input.addEventListener('change', function () {
            const termKey = this.getAttribute('data-term-evaluation-upload');
            const fileName = this.files && this.files.length ? this.files[0].name : '';
            const uploadNameLabel = document.querySelector(`[data-term-evaluation-upload-name="${termKey}"]`);
            if (uploadNameLabel) {
                uploadNameLabel.textContent = fileName ? `Uploaded: ${fileName}` : 'No file uploaded yet.';
            }
            persistTermEvaluation(termKey, { uploadedFileName: fileName });
        });
    });

    document.getElementById('reset-enrollment')?.addEventListener('click', resetEnrollment);
}

function showAlert(message, type) {
    const alertType = type || 'info';
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${alertType}`;
    alertEl.textContent = message;

    const activeStep = document.querySelector('.step-content.active');
    if (!activeStep) {
        window.alert(message);
        return;
    }

    activeStep.querySelectorAll('.alert').forEach((existingAlert) => existingAlert.remove());
    activeStep.insertBefore(alertEl, activeStep.firstChild);
    setTimeout(() => alertEl.remove(), 5000);
}

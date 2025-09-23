(() => {
  let disposeCursor = null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerFine = window.matchMedia('(pointer: fine)');
  const hoverCapable = window.matchMedia('(hover: hover)');

  const INTERACTIVE_SELECTOR = 'a, button, [role="button"], summary, input:not([type="hidden"]), textarea, select, .social-link, .language';
  const FORM_CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

  const canEnable = () => !prefersReducedMotion.matches && pointerFine.matches && hoverCapable.matches;

  const enableCursor = () => {
    if (disposeCursor || !document.body) {
      return;
    }

    const cursor = document.createElement('div');
    cursor.className = 'cursor-trail';

    const glow = document.createElement('div');
    glow.className = 'cursor-trail__glow';

    const face = document.createElement('div');
    face.className = 'cursor-trail__face';

    const hat = document.createElement('div');
    hat.className = 'cursor-trail__hat';
    const hatBrim = document.createElement('div');
    hatBrim.className = 'cursor-trail__hat-brim';
    hat.appendChild(hatBrim);

    const eyeLeft = document.createElement('div');
    eyeLeft.className = 'cursor-trail__eye cursor-trail__eye--left';
    const eyeRight = document.createElement('div');
    eyeRight.className = 'cursor-trail__eye cursor-trail__eye--right';

    const mouth = document.createElement('div');
    mouth.className = 'cursor-trail__mouth';

    const moustache = document.createElement('div');
    moustache.className = 'cursor-trail__moustache';

    face.append(hat, eyeLeft, eyeRight, mouth, moustache);
    cursor.append(glow, face);
    document.body.appendChild(cursor);
    document.documentElement.classList.add('has-custom-cursor');

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let lastX = currentX;
    let lastY = currentY;

    let targetScale = 1;
    let currentScale = 1;

    let targetTilt = 0;
    let currentTilt = 0;

    let targetBounce = 0;
    let currentBounce = 0;

    let targetLookX = 0;
    let targetLookY = 0;
    let currentLookX = 0;
    let currentLookY = 0;

    let animationFrameId = 0;
    let isVisible = false;
    let isPressed = false;
    let isInteractive = false;
    let isReading = false;
    let giggleTimeout = 0;

    const applyTransform = () => {
      cursor.style.setProperty('--cursor-x', `${currentX}px`);
      cursor.style.setProperty('--cursor-y', `${currentY}px`);
      cursor.style.setProperty('--cursor-scale', currentScale.toFixed(3));
      cursor.style.setProperty('--cursor-tilt', `${currentTilt.toFixed(2)}deg`);
      cursor.style.setProperty('--cursor-bounce', `${currentBounce.toFixed(2)}px`);
      cursor.style.setProperty('--cursor-look-x', `${currentLookX.toFixed(2)}px`);
      cursor.style.setProperty('--cursor-look-y', `${currentLookY.toFixed(2)}px`);
    };

    const updateScaleForState = () => {
      if (isInteractive && isPressed) {
        targetScale = 1.05;
      } else if (isInteractive) {
        targetScale = 1.2;
      } else if (isPressed) {
        targetScale = 0.88;
      } else {
        targetScale = 1;
      }
    };

    const show = () => {
      if (!isVisible) {
        cursor.classList.add('is-visible');
        isVisible = true;
      }
    };

    const hide = () => {
      if (isVisible) {
        cursor.classList.remove('is-visible');
        isVisible = false;
      }
    };

    const triggerGiggle = (duration = 420) => {
      cursor.classList.add('is-giggling');
      window.clearTimeout(giggleTimeout);
      giggleTimeout = window.setTimeout(() => {
        cursor.classList.remove('is-giggling');
      }, duration);
    };

    const animate = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      currentX += dx * 0.2;
      currentY += dy * 0.2;

      const velocityX = currentX - lastX;
      const velocityY = currentY - lastY;
      const speed = Math.hypot(velocityX, velocityY);

      currentScale += (targetScale - currentScale) * 0.2;

      targetTilt = Math.max(Math.min(velocityX * 14, 18), -18);
      currentTilt += (targetTilt - currentTilt) * 0.18;

      targetBounce = Math.max(Math.min(velocityY * -18, 16), -16);
      currentBounce += (targetBounce - currentBounce) * 0.22;

      targetLookX = Math.max(Math.min(velocityX * 16, 12), -12);
      targetLookY = Math.max(Math.min(velocityY * -14, 10), -10);
      currentLookX += (targetLookX - currentLookX) * 0.22;
      currentLookY += (targetLookY - currentLookY) * 0.22;

      cursor.classList.toggle('is-moving', speed > 0.45);

      applyTransform();

      lastX = currentX;
      lastY = currentY;

      animationFrameId = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType !== 'mouse') {
        return;
      }

      targetX = event.clientX;
      targetY = event.clientY;

      const interactiveTarget = event.target.closest?.(INTERACTIVE_SELECTOR);
      const nextIsInteractive = Boolean(interactiveTarget);
      const nextIsReading = interactiveTarget ? FORM_CONTROL_TAGS.has(interactiveTarget.tagName) : false;

      if (nextIsInteractive !== isInteractive) {
        isInteractive = nextIsInteractive;
        cursor.classList.toggle('is-interactive', isInteractive);
        if (isInteractive) {
          triggerGiggle();
        }
      }

      if (nextIsReading !== isReading) {
        isReading = nextIsReading;
        cursor.classList.toggle('is-reading', isReading);
      }

      updateScaleForState();
      show();
    };

    const handlePointerOut = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') {
        return;
      }
      if (event.relatedTarget) {
        return;
      }
      window.clearTimeout(giggleTimeout);
      isInteractive = false;
      isReading = false;
      cursor.classList.remove('is-interactive', 'is-reading', 'is-giggling', 'is-moving');
      updateScaleForState();
      hide();
    };

    const handlePointerDown = (event) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      isPressed = true;
      cursor.classList.add('is-pressed');
      if (!isInteractive) {
        triggerGiggle(360);
      }
      updateScaleForState();
    };

    const handlePointerUp = (event) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      isPressed = false;
      cursor.classList.remove('is-pressed');
      updateScaleForState();
    };

    const resetStates = () => {
      window.clearTimeout(giggleTimeout);
      isPressed = false;
      isInteractive = false;
      isReading = false;
      cursor.classList.remove('is-pressed', 'is-interactive', 'is-reading', 'is-giggling', 'is-moving');
      updateScaleForState();
      hide();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        resetStates();
      }
    };

    const handleWindowBlur = () => {
      resetStates();
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    document.addEventListener('pointerout', handlePointerOut);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    applyTransform();
    updateScaleForState();
    animate();

    disposeCursor = () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(giggleTimeout);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.documentElement.classList.remove('has-custom-cursor');
      cursor.remove();
      disposeCursor = null;
    };
  };

  const disableCursor = () => {
    if (typeof disposeCursor === 'function') {
      disposeCursor();
    }
  };

  const evaluate = () => {
    if (!document.body) {
      return;
    }

    if (canEnable()) {
      enableCursor();
    } else {
      disableCursor();
    }
  };

  const subscribe = (mql) => {
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', evaluate);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(evaluate);
    }
  };

  [prefersReducedMotion, pointerFine, hoverCapable].forEach(subscribe);

  const onReady = () => {
    evaluate();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();

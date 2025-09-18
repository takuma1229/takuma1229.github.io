(() => {
  let disposeCursor = null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerFine = window.matchMedia('(pointer: fine)');
  const hoverCapable = window.matchMedia('(hover: hover)');
  const INTERACTIVE_SELECTOR = 'a, button, [role="button"], summary, input:not([type="hidden"]), textarea, select, .social-link, .language';

  const canEnable = () => !prefersReducedMotion.matches && pointerFine.matches && hoverCapable.matches;

  const enableCursor = () => {
    if (disposeCursor || !document.body) {
      return;
    }

    const cursor = document.createElement('div');
    cursor.className = 'cursor-trail';

    const glow = document.createElement('div');
    glow.className = 'cursor-trail__glow';

    const core = document.createElement('div');
    core.className = 'cursor-trail__core';

    cursor.appendChild(glow);
    cursor.appendChild(core);
    document.body.appendChild(cursor);
    document.documentElement.classList.add('has-custom-cursor');

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let targetScale = 1;
    let currentScale = 1;
    let animationFrameId = 0;
    let isVisible = false;
    let isPressed = false;
    let isInteractive = false;

    const applyTransform = () => {
      cursor.style.setProperty('--cursor-x', `${currentX}px`);
      cursor.style.setProperty('--cursor-y', `${currentY}px`);
      cursor.style.setProperty('--cursor-scale', currentScale.toFixed(3));
    };

    const updateScaleForState = () => {
      targetScale = isPressed ? (isInteractive ? 0.88 : 0.82) : (isInteractive ? 1.25 : 1.0);
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

    const animate = () => {
      currentX += (targetX - currentX) * 0.2;
      currentY += (targetY - currentY) * 0.2;
      currentScale += (targetScale - currentScale) * 0.2;
      applyTransform();
      animationFrameId = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType !== 'mouse') {
        return;
      }

      targetX = event.clientX;
      targetY = event.clientY;

      const interactiveTarget = event.target.closest?.(INTERACTIVE_SELECTOR);
      const wasInteractive = isInteractive;
      isInteractive = Boolean(interactiveTarget);

      if (isInteractive !== wasInteractive) {
        cursor.classList.toggle('is-interactive', isInteractive);
        updateScaleForState();
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
      isInteractive = false;
      cursor.classList.remove('is-interactive');
      updateScaleForState();
      hide();
    };

    const handlePointerDown = (event) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      isPressed = true;
      cursor.classList.add('is-pressed');
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isPressed = false;
        isInteractive = false;
        cursor.classList.remove('is-pressed');
        cursor.classList.remove('is-interactive');
        updateScaleForState();
        hide();
      }
    };

    const handleWindowBlur = () => {
      isPressed = false;
      isInteractive = false;
      cursor.classList.remove('is-pressed');
      cursor.classList.remove('is-interactive');
      updateScaleForState();
      hide();
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

"use strict";

window.input = {
  left: false,
  right: false,
  down: false,
  downPressed: false,
  jump: false,
  jumpW: false,
  jumpPressed: false,
  wJumpPressed: false,
  boost: false,
  shift: false,
  shiftPressed: false,
  fire: false,
  meleePressed: false,
  mouseX: 0,
  mouseY: 0,
  pointerActive: false,
};

window.clearPressedInputs = function clearPressedInputs() {
  input.downPressed = false;
  input.jumpPressed = false;
  input.wJumpPressed = false;
  input.shiftPressed = false;
  input.meleePressed = false;
};

window.setupInput = function setupInput(canvas, handlers) {
  let jumpFromW = false;
  let jumpFromSpace = false;
  const blockedBrowserCodes = new Set(["KeyD", "KeyF", "KeyG", "KeyL", "KeyO", "KeyP", "KeyR", "KeyS", "KeyW", "Minus", "Equal", "Digit0"]);

  function syncJumpState() {
    input.jump = jumpFromW || jumpFromSpace;
  }

  function shouldCaptureShortcuts() {
    return !handlers.shouldCaptureShortcuts || handlers.shouldCaptureShortcuts();
  }

  function shouldPreventBrowserShortcut(event) {
    if (!shouldCaptureShortcuts()) {
      return false;
    }

    if (event.code === "F10" || event.code === "AltLeft" || event.code === "AltRight") {
      return true;
    }

    return (event.ctrlKey || event.metaKey) && blockedBrowserCodes.has(event.code);
  }

  function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.canvas.width / rect.width;
    const scaleY = CONFIG.canvas.height / rect.height;
    input.mouseX = (event.clientX - rect.left) * scaleX;
    input.mouseY = (event.clientY - rect.top) * scaleY;
    input.pointerActive = true;
  }

  window.addEventListener("keydown", (event) => {
    if (shouldPreventBrowserShortcut(event) || (event.repeat && (event.code === "KeyR" || event.code === "Space"))) {
      event.preventDefault();
    }

    switch (event.code) {
      case "KeyA":
        input.left = true;
        break;
      case "KeyD":
        input.right = true;
        break;
      case "KeyS":
        if (!input.down) {
          input.downPressed = true;
        }
        input.down = true;
        break;
      case "KeyW":
        if (!jumpFromW) {
          if (!input.jump) {
            input.jumpPressed = true;
          }
          input.wJumpPressed = true;
          jumpFromW = true;
          input.jumpW = true;
          syncJumpState();
        }
        break;
      case "Space":
        if (!jumpFromSpace) {
          if (!input.jump) {
            input.jumpPressed = true;
          }
          jumpFromSpace = true;
          syncJumpState();
        }
        input.boost = true;
        if (handlers.onStart) {
          handlers.onStart();
        }
        event.preventDefault();
        break;
      case "Enter":
        if (handlers.onStart) {
          handlers.onStart();
        }
        break;
      case "ShiftLeft":
      case "ShiftRight":
        if (!input.shift) {
          input.shiftPressed = true;
        }
        input.shift = true;
        break;
      case "KeyR":
        if (handlers.onRestart) {
          handlers.onRestart();
        }
        break;
      case "Escape":
        if (handlers.onMenu) {
          handlers.onMenu();
        }
        break;
    }
  });

  window.addEventListener("keyup", (event) => {
    if (shouldPreventBrowserShortcut(event)) {
      event.preventDefault();
    }

    switch (event.code) {
      case "KeyA":
        input.left = false;
        break;
      case "KeyD":
        input.right = false;
        break;
      case "KeyS":
        input.down = false;
        break;
      case "KeyW":
        jumpFromW = false;
        input.jumpW = false;
        syncJumpState();
        break;
      case "Space":
        jumpFromSpace = false;
        syncJumpState();
        input.boost = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        input.shift = false;
        break;
    }
  });

  canvas.addEventListener("mousemove", updateMousePosition);
  canvas.addEventListener("mousedown", (event) => {
    updateMousePosition(event);

    if (event.button === 0) {
      input.fire = true;
      input.pointerActive = true;
      if (handlers.onStart) {
        handlers.onStart();
      }
    }

    if (event.button === 2) {
      input.meleePressed = true;
      input.pointerActive = true;
      event.preventDefault();
      if (handlers.onStart) {
        handlers.onStart();
      }
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      input.fire = false;
    }
  });

  canvas.addEventListener("mouseleave", () => {
    input.pointerActive = false;
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
};

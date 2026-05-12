import AppKit
import CoreGraphics

let SIZE: CGFloat = 1024
let cx = SIZE / 2
let cy = SIZE / 2

let image = NSImage(size: NSSize(width: SIZE, height: SIZE))
image.lockFocus()
guard let ctx = NSGraphicsContext.current?.cgContext else { exit(1) }

// ── Fond arrondi macOS ─────────────────────────────────────────────────────────
let bgPath = CGPath(roundedRect: CGRect(x: 0, y: 0, width: SIZE, height: SIZE),
                    cornerWidth: 224, cornerHeight: 224, transform: nil)
ctx.addPath(bgPath)
let bgGrad = CGGradient(
    colorsSpace: CGColorSpaceCreateDeviceRGB(),
    colors: [
        NSColor(red: 0.08, green: 0.09, blue: 0.12, alpha: 1).cgColor,
        NSColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1).cgColor,
    ] as CFArray, locations: [0, 1])!
ctx.clip()
ctx.drawLinearGradient(bgGrad,
    start: CGPoint(x: cx, y: SIZE), end: CGPoint(x: cx, y: 0), options: [])
ctx.resetClip()

// ── Bloc-notes ────────────────────────────────────────────────────────────────
let padW: CGFloat  = 500
let padH: CGFloat  = 590
let padX           = cx - padW / 2
let padY: CGFloat  = 155
let padCorner: CGFloat = 52

// Ombre portée du bloc-notes
ctx.setShadow(offset: CGSize(width: 0, height: -24), blur: 70,
              color: NSColor.black.withAlphaComponent(0.75).cgColor)

// Corps du bloc-notes
let padPath = CGPath(roundedRect: CGRect(x: padX, y: padY, width: padW, height: padH),
                     cornerWidth: padCorner, cornerHeight: padCorner, transform: nil)
ctx.addPath(padPath)
// Couleur bloc : sombre mais distincte du fond
ctx.setFillColor(NSColor(red: 0.13, green: 0.15, blue: 0.20, alpha: 1).cgColor)
ctx.fillPath()
ctx.setShadow(offset: .zero, blur: 0, color: nil)

// Contour subtil
ctx.addPath(padPath)
ctx.setStrokeColor(NSColor(red: 0.25, green: 0.28, blue: 0.36, alpha: 0.8).cgColor)
ctx.setLineWidth(6)
ctx.strokePath()

// Bande de reliure en haut (spirale simulée par une barre)
let bindH: CGFloat = 52
let bindPath = CGPath(roundedRect: CGRect(x: padX, y: padY + padH - bindH, width: padW, height: bindH),
                      cornerWidth: padCorner, cornerHeight: padCorner, transform: nil)
ctx.addPath(bindPath)
ctx.setFillColor(NSColor(red: 0.00, green: 1.00, blue: 0.53, alpha: 0.18).cgColor)
ctx.fillPath()
// Ligne de séparation reliure
ctx.move(to: CGPoint(x: padX, y: padY + padH - bindH))
ctx.addLine(to: CGPoint(x: padX + padW, y: padY + padH - bindH))
ctx.setStrokeColor(NSColor(red: 0.00, green: 1.00, blue: 0.53, alpha: 0.35).cgColor)
ctx.setLineWidth(3)
ctx.strokePath()

// Petits cercles de spirale sur la reliure
let spiralY = padY + padH - bindH / 2
let spiralCount = 7
let spiralSpacing = padW / CGFloat(spiralCount + 1)
for i in 1...spiralCount {
    let sx = padX + spiralSpacing * CGFloat(i)
    let sr: CGFloat = 10
    ctx.addEllipse(in: CGRect(x: sx - sr, y: spiralY - sr, width: sr * 2, height: sr * 2))
    ctx.setFillColor(NSColor(red: 0.00, green: 1.00, blue: 0.53, alpha: 0.55).cgColor)
    ctx.fillPath()
}

// Lignes de texte sur le bloc-notes
let lineStartX = padX + 52
let lineEndX   = padX + padW - 52
let firstLineY = padY + padH - bindH - 72
let lineSpacing: CGFloat = 54
let lineCount = 5
ctx.setStrokeColor(NSColor(red: 0.35, green: 0.40, blue: 0.52, alpha: 0.45).cgColor)
ctx.setLineWidth(8)
ctx.setLineCap(.round)
for i in 0..<lineCount {
    let ly = firstLineY - CGFloat(i) * lineSpacing
    // Dernière ligne plus courte (style "fin de texte")
    let endX = (i == lineCount - 1) ? lineStartX + (lineEndX - lineStartX) * 0.55 : lineEndX
    ctx.move(to: CGPoint(x: lineStartX, y: ly))
    ctx.addLine(to: CGPoint(x: endX, y: ly))
    ctx.strokePath()
}

// ── Cadenas par-dessus ────────────────────────────────────────────────────────
let lockCX = cx
let lockCY = padY + 168          // centré sur la partie basse du bloc-notes

let accent    = NSColor(red: 0.00, green: 1.00, blue: 0.53, alpha: 1)
let accentDim = NSColor(red: 0.00, green: 0.80, blue: 0.41, alpha: 0.7)

// Ombre du cadenas
ctx.setShadow(offset: CGSize(width: 0, height: -8), blur: 50,
              color: NSColor(red: 0, green: 0.5, blue: 0.25, alpha: 0.45).cgColor)

// Corps du cadenas
let lkW: CGFloat = 196
let lkH: CGFloat = 156
let lkCorner: CGFloat = 32
let lkX = lockCX - lkW / 2
let lkY = lockCY - lkH / 2 - 20
let lkStroke: CGFloat = 20

let lkPath = CGPath(roundedRect: CGRect(x: lkX, y: lkY, width: lkW, height: lkH),
                    cornerWidth: lkCorner, cornerHeight: lkCorner, transform: nil)

// Fond corps cadenas (légèrement opaque pour lisibilité)
ctx.addPath(lkPath)
ctx.setFillColor(NSColor(red: 0.04, green: 0.12, blue: 0.08, alpha: 0.88).cgColor)
ctx.fillPath()

ctx.setShadow(offset: .zero, blur: 0, color: nil)

// Contour corps
ctx.addPath(lkPath)
ctx.setStrokeColor(accent.cgColor)
ctx.setLineWidth(lkStroke)
ctx.strokePath()

// Anse du cadenas
let archCX = lockCX
let archBaseY = lkY + lkH - 4
let archRX: CGFloat = 58
let archTop = archBaseY + 108
let archBezier = CGMutablePath()
archBezier.move(to: CGPoint(x: archCX - archRX, y: archBaseY))
archBezier.addCurve(
    to:       CGPoint(x: archCX + archRX, y: archBaseY),
    control1: CGPoint(x: archCX - archRX, y: archTop),
    control2: CGPoint(x: archCX + archRX, y: archTop)
)
ctx.addPath(archBezier)
ctx.setStrokeColor(accent.cgColor)
ctx.setLineWidth(lkStroke)
ctx.setLineCap(.round)
ctx.strokePath()

// Trou de serrure
let keyCX = lockCX
let keyCY = lkY + lkH / 2
let keyR: CGFloat = 24
// Cercle
ctx.addEllipse(in: CGRect(x: keyCX - keyR, y: keyCY - keyR + 8, width: keyR * 2, height: keyR * 2))
ctx.setFillColor(NSColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1).cgColor)
ctx.fillPath()
// Fente
let slotW: CGFloat = 17; let slotH: CGFloat = 30
ctx.addPath(CGPath(roundedRect: CGRect(x: keyCX - slotW/2, y: keyCY - slotH - 4,
                                       width: slotW, height: slotH),
                   cornerWidth: slotW/2, cornerHeight: slotW/2, transform: nil))
ctx.setFillColor(NSColor(red: 0.04, green: 0.04, blue: 0.06, alpha: 1).cgColor)
ctx.fillPath()
// Contour cercle
ctx.addEllipse(in: CGRect(x: keyCX - keyR, y: keyCY - keyR + 8, width: keyR * 2, height: keyR * 2))
ctx.setStrokeColor(accentDim.cgColor)
ctx.setLineWidth(4)
ctx.strokePath()

// ── Export PNG ────────────────────────────────────────────────────────────────
image.unlockFocus()
guard
    let tiff   = image.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: tiff),
    let png    = bitmap.representation(using: .png, properties: [:])
else { print("Erreur export"); exit(1) }

let outPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon_1024.png"
try! png.write(to: URL(fileURLWithPath: outPath))
print("✓ \(outPath)")

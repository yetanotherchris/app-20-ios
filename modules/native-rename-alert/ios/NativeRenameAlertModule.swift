import ExpoModulesCore
import ObjectiveC
import UIKit

private var renameAlertStateKey: UInt8 = 0

private final class RenameAlertState: NSObject, UITextFieldDelegate {
  private let saveAction: UIAlertAction

  init(saveAction: UIAlertAction) {
    self.saveAction = saveAction
  }

  @objc func textChanged(_ textField: UITextField) {
    updateSaveAction(textField.text)
  }

  func textField(
    _ textField: UITextField,
    shouldChangeCharactersIn range: NSRange,
    replacementString string: String
  ) -> Bool {
    guard let range = Range(range, in: textField.text ?? "") else { return false }
    let value = (textField.text ?? "").replacingCharacters(in: range, with: string)
    guard value.count <= 80 else { return false }
    updateSaveAction(value)
    return true
  }

  private func updateSaveAction(_ value: String?) {
    let value = value ?? ""
    saveAction.isEnabled = !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.count <= 80
  }
}

public class NativeRenameAlertModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeRenameAlert")

    AsyncFunction("prompt") { (initialValue: String, promise: Promise) in
      guard let viewController = Self.activeViewController() else {
        promise.reject("ERR_NO_VIEW_CONTROLLER", "Cannot present the rename alert.")
        return
      }

      let alert = UIAlertController(title: "Rename conversation", message: nil, preferredStyle: .alert)
      let saveAction = UIAlertAction(title: "Save", style: .default) { _ in
        promise.resolve(alert.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines))
      }
      saveAction.isEnabled = !initialValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      let state = RenameAlertState(saveAction: saveAction)

      alert.addTextField { textField in
        textField.autocapitalizationType = .sentences
        textField.delegate = state
        textField.text = String(initialValue.prefix(80))
        textField.addTarget(state, action: #selector(RenameAlertState.textChanged(_:)), for: .editingChanged)
      }
      alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in promise.resolve(nil) })
      alert.addAction(saveAction)
      objc_setAssociatedObject(alert, &renameAlertStateKey, state, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
      viewController.present(alert, animated: true)
    }.runOnQueue(.main)
  }

  private static func activeViewController() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
    var viewController = scene?.windows.first { $0.isKeyWindow }?.rootViewController
    while let presented = viewController?.presentedViewController {
      viewController = presented
    }
    return viewController
  }
}

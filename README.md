# Ritam Email Template Language Support for VS Code

Enhance your development workflow for `.ret` (Ritam Email Template) files directly within Visual Studio Code! This extension provides robust language support, boosting your productivity with advanced features for syntax, variables, and code generation.

## ✨ Features

* **Intelligent Syntax Highlighting**: Get beautiful and accurate syntax highlighting that precisely delineates JSON, HTML, and plain text sections within your `.ret` files. It also intelligently highlights Ritam-specific templating constructs like `if`/`for` blocks and variables, even when embedded within HTML or plain text.
    <!-- You can insert a screenshot here, for example: ![Syntax Highlighting Example](images/syntax-highlighting.png) -->

* **Customizable Separator Colors**: Personalize the visual appearance of your template separators (`---JSON---`, `---HTML---`, `---TEXT---`) to seamlessly integrate with your preferred VS Code theme or for better visual distinction.

    ```json
    // Example settings.json configuration
    {
        "ret.jsonSeperator": "#FFFF00", // Default: Bright Yellow
        "ret.htmlSeperator": "#E44D26", // Default: Vivid Orange-Red
        "ret.textSeperator": "#008000"  // Default: Dark Green
    }
    ```

* **Smart Variable Management & Diagnostics**:
    * **Undeclared Variable Errors**: Receive immediate feedback with red squiggly underlines when you use a variable in your HTML or Text sections that hasn't been explicitly declared in your JSON `variables` or `theme` objects.
    * **Unused Variable Warnings**: Keep your templates clean and efficient. The extension warns you about variables declared in your JSON `variables` or `theme` sections that are never actually utilized in your HTML or Text content.
    * **Strict JSON Structure Validation**: Adhere to your `RETMeta` schema with built-in validation. The extension flags errors for missing mandatory properties (like `name` or `variables`), incorrect data types (e.g., `variables` not being an object), and provides warnings for any unknown top-level properties in your JSON block.

* **Context-Aware Autocompletion**: Boost your typing speed! Get intelligent autocompletion suggestions for all your declared variables (from both the `variables` and `theme` objects) as soon as you type `{{` in your template sections.

* **Helpful Code Snippets**: Accelerate common tasks with predefined snippets for frequently used Ritam templating patterns:
    * `if`: Inserts a basic `{{#if condition}}...{{/if}}` block.
    * `ifelse`: Inserts an `{{#if condition}}...{{else}}...{{/if}}` block.
    * `for`: Inserts a `{{#for item in collection}}...{{/for}}` loop.
    * `retinit`: Kickstart a new `.ret` file with a complete, basic template structure, including pre-filled JSON, HTML, and TEXT sections.
    <!-- You can insert a screenshot here, for example: ![Snippet Example](images/snippets-usage.png) -->

## 🚀 Installation

1.  Open Visual Studio Code.
2.  Navigate to the Extensions view by clicking the Square icon on the Sidebar or pressing `Ctrl+Shift+X` (Windows/Linux) / `Cmd+Shift+X` (macOS).
3.  In the search bar, type `Ritam Email Template`.
4.  Click the "Install" button for the "Ritam Email Template" extension.

## ✍️ Usage

1.  **Create a new file** and save it with the `.ret` extension (e.g., `my_welcome_email.ret`). The extension will automatically activate.
2.  **Initialize your template**: In an empty `.ret` file, simply type `retinit` and press `Tab` to generate a standard Ritam Email Template structure.
3.  **Define Variables**: Populate the JSON section with your template's metadata and variables under the `"variables"` or `"theme"` objects.
4.  **Build Content**: Write your dynamic content in the HTML and Text sections, utilizing `{{variableName}}` syntax. Leverage `if` and `for` snippets for conditional logic and loops.
5.  **Real-time Feedback**: As you type, the extension will provide immediate syntax highlighting, autocompletion suggestions, and diagnostic messages for any structural errors, undeclared variables, or unused variables.

## ⚙️ Configuration

You can customize the colors of the `---JSON---`, `---HTML---`, and `---TEXT---` separators by adding the following to your VS Code `settings.json` file:

```json
{
    "ret.jsonSeperator": "#FFD700", // Example: Gold
    "ret.htmlSeperator": "#FF4500", // Example: OrangeRed
    "ret.textSeperator": "#32CD32"  // Example: LimeGreen
}
# Merci SDK: A Modern SDK for the JetBrains AI Platform

[![View on GitHub](https://img.shields.io/badge/View%20on-GitHub-blue?logo=github)](https://github.com/mobeetle/merci-sdk/)

**Fluent, robust, and designed for modern JavaScript. Zero dependencies, first-class support for streaming, tool use, and advanced model control.**

Merci SDK is a lightweight, dependency-free library for interacting with the JetBrains AI Platform. It's designed to be intuitive, powerful, and easy to integrate into any project without the need for a package manager or complex build steps.

## ✨ Key Features

*   **Fluent & Intuitive API**: Chainable methods like `client.chat().withTools()` make building requests simple and readable.
*   **Zero Dependencies**: Lightweight and self-contained. No `node_modules`, no package manager required. Just pure JavaScript.
*   **Powerful Tool Use**: High-level agent (`.run()`) and low-level manual controls for simple or complex agentic behavior.
*   **Intelligent Parameter Handling**: Automatically filters unsupported parameters per model, preventing API errors and providing helpful warnings.
*   **Automatic Authentication**: Seamlessly handles JWT refreshing in the background, so you don't have to worry about expired tokens.
*   **Modern & Typed**: Written in modern ES Modules and includes a full TypeScript declaration file for an excellent developer experience.

## 🚀 Getting Started

### Prerequisites

*   **Node.js**: v18.x or newer recommended.
*   **JetBrains AI Platform Account**: An active account and a JSON Web Token (JWT) are required.

### Installation

No package manager is needed. To use the SDK, simply download the desired file from the `/lib` directory on GitHub and import it into your project.

*   `merci.2.11.0.mjs`: The full library file, great for development.
*   `merci.2.11.0-min.mjs`: Minified version for production.
*   `merci.2.11.0.d.ts`: TypeScript definitions for autocompletion.

If you want to run the tutorial lessons locally, clone the entire repository:

```bash
git clone https://github.com/mobeetle/merci-sdk.git
cd merci-sdk
```

### Setup

1.  **Configure Your Authentication Token**

    Create a new folder named `secret`, and inside it, a new file named `token.mjs`. Add the following content, replacing `"YOUR_JWT_HERE"` with your actual token.

    ```javascript
    // File: secret/token.mjs
    // This file securely exports your authentication token.

    export const token = "YOUR_JWT_HERE";
    ```

    > **⚠️ Security Warning:** The `secret` directory is already included in the project's `.gitignore` file to prevent you from accidentally committing your token. Never share this file or commit it to a public repository.

2.  **Project Structure**

    *   `/lib`: Contains the core SDK files.
    *   `/examples`: Contains all the tutorial lesson scripts (`.mjs` files).
    *   `/docs`: Contains the HTML files for the documentation website.

### ⚡ Quick Start: Your First API Call

The `examples/lesson_1_basic_usage.mjs` file is the best place to start. It demonstrates the simplest possible interaction: sending a prompt to the model and streaming the response.

To run the example from your terminal:

```bash
node examples/lesson_1_basic_usage.mjs
```

You should see output like this:

```
--- Merci SDK Tutorial: Lesson 1 - Basic Usage (Model: google-chat-gemini-flash-2.5) ---
[STEP 1] Initializing MerciClient...
[STEP 2] Preparing prompt and input data...
[STEP 3] Configuring the chat session...
[STEP 4] Creating the message payload...
[STEP 5] Sending request and processing stream...
🤖 Assistant > Stardust Brew: Your cosmic cup of inspiration.

[INFO] Stream finished. Response fully received.


--- FINAL RESULT ---
👤 User > Write a short, inspiring tagline for a new coffee brand called 'Stardust Brew'.
🤖 Assistant > Stardust Brew: Your cosmic cup of inspiration.
--------------------
```

## 📚 Tutorials

A collection of step-by-step guides is available to take you from basic usage to advanced agentic patterns. Each lesson introduces one new concept.

**[View the Full Tutorials Here on GitHub](../examples/)  
[or Here on the website](https://mobeetle.github.io/merci-sdk/tutorials.html)**

Topics include:

*   **Basics**: System Messages, Model Selection, Media Messages, and Multi-turn Chat.
*   **Advanced Patterns**: Guaranteed JSON Output, Structured Extraction, and Parallel Extraction.
*   **Agentic Flows**: Basic Tool Usage, Advanced Parallel Tools, and Multi-Turn Clarification.
*   **SDK Features**: Automated Token Management.

## 📖 API Reference

This section provides a high-level overview of the Merci SDK's classes, methods, and types.

**[View the Full API Reference Here](https://mobeetle.github.io/merci-sdk/api_reference.html)**

### `MerciClient`

The main entry point for the SDK. It handles authentication, token refreshing, and serves as the factory for creating `ChatSession` instances.

*   `new MerciClient({ token })`: Initializes the client.
*   `.chat(profile)`: Creates a new, configurable chat session for a specific model.
*   **Events**: `api_request`, `api_response`, `error`, `tool_start`, `tool_finish`, `parameter_warning`.

### `ChatSession`

Represents a configured chat session with a fluent, chainable interface.

*   `.withTools(tools)`: Equips the session with tools the model can use.
*   `.withSystemMessage(content)`: Configures a system message to guide the AI.
*   `.withParameters(builderFn)`: Configures advanced model parameters.
*   `.stream(input)`: Low-level method that returns an async iterator of real-time events.
*   `.run(input)`: High-level "agent" method that automates the entire multi-step tool-use process.

### `ParameterBuilder`

A fluent class for setting advanced model parameters like `.temperature()`, `.topP()`, `.asJson()`, and `.toolChoiceAuto()`.

### Helpers

Exported functions to simplify common tasks like creating message objects (`createUserMessage`, `createMediaMessage`) and executing tools (`executeTools`).

## ❤️ Contributing

We're excited to have you join our community! Your contributions help make the Merci SDK better for everyone. All contributions are welcome, from bug reports to new features.

### 🐞 Reporting Bugs

Found a problem? Please let us know by creating a new issue on our [GitHub Issues page](https://github.com/mobeetle/merci-sdk/issues). When reporting a bug, please include as much detail as possible:

*   A clear and descriptive title.
*   The SDK version you are using.
*   Your Node.js version.
*   A code snippet or steps to reproduce the bug.
*   The expected behavior vs. the actual behavior.

### 💡 Suggesting Enhancements

Have an idea for a new feature or an improvement? We'd love to hear it. Please submit it by creating a new issue on our [GitHub Issues page](https://github.com/mobeetle/merci-sdk/issues).

### 🚀 Submitting Pull Requests

If you'd like to contribute code, please follow these steps:

1.  Fork the repository on GitHub.
2.  Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name`.
3.  Make your changes and commit them with a clear, descriptive message.
4.  Push your branch to your fork: `git push origin feature/your-feature-name`.
5.  Open a pull request from your fork to the main Merci SDK repository.

## 📜 License

See the [LICENSE](https://github.com/mobeetle/merci-sdk/blob/main/LICENSE.md) file for more information. By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---
*© 2025 Lukáš Michna (Mobeetle). All rights reserved.*

# Four Souls Scraper

This project is a Python-based web scraper designed to extract character card data from the Four Souls website. It gathers information such as card names, sets, types, HP, ATK, effects, and quotes.

## Project Structure

```
four-souls-scraper
├── scrapeForCard.py        # Main script for scraping character card data
├── requirements.txt        # Python packages required for the project
├── Dockerfile              # Docker image definition for the project
├── .dockerignore           # Files to ignore when building the Docker image
├── .devcontainer           # Configuration for the development container
│   ├── devcontainer.json   # Development container settings for VS Code
│   └── Dockerfile          # Docker image for the development container
├── .vscode                 # VS Code specific settings and extensions
│   ├── settings.json       # Workspace-specific settings for VS Code
│   └── extensions.json     # Recommended extensions for the project
└── README.md               # Project documentation
```

## Setup Instructions

### Local Environment

1. Clone the repository:
   ```
   git clone <repository-url>
   cd four-souls-scraper
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

### Running the Scraper

To run the scraper, execute the following command:
```
python scrapeForCard.py
```

### Docker Setup

1. Build the Docker image:
   ```
   docker build -t four-souls-scraper .
   ```

2. Run the Docker container:
   ```
   docker run --rm four-souls-scraper
   ```

### Development Container

To use the development container in Visual Studio Code:

1. Open the project in VS Code.
2. Press `F1` and select `Remote-Containers: Reopen in Container`.

This will set up the development environment with all necessary tools and configurations.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
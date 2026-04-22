from setuptools import find_packages, setup

setup(
    name="canadian-representatives-finder",
    version="1.0.0",
    packages=find_packages(),
    install_requires=["requests>=2.28.0"],
    python_requires=">=3.10",
    entry_points={
        "console_scripts": [
            "canrep=src.main:run",
        ]
    },
    description="Find Canadian representatives (MP, MNA, councillors) by postal code",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/canadian-representatives-finder",
    license="MIT",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)

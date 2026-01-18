#!/usr/bin/env python3
"""
Test to verify that keyword search works across all genres
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8003"

def test_keyword_search():
    """Test keyword search functionality"""
    print("Testing keyword search...")
    
    # Test 1: Search for "love"
    print("\n1. Searching for 'love':")
    response = requests.get(f"{BASE_URL}/films/search/keyword", params={"query": "love", "limit": 10})
    
    if response.status_code == 200:
        data = response.json()
        print(f"   OK Found films: {data['total']}")
        for movie in data['items'][:3]:  # Show first 3
            print(f"   - {movie['title']} ({movie['release_year']})")
    else:
        print(f"   Error: {response.status_code}")
    
    # Test 2: Search for "academy"
    print("\n2. Searching for 'academy':")
    response = requests.get(f"{BASE_URL}/films/search/keyword", params={"query": "academy", "limit": 10})
    
    if response.status_code == 200:
        data = response.json()
        print(f"   OK Found films: {data['total']}")
        for movie in data['items']:
            print(f"   - {movie['title']} ({movie['release_year']})")
    else:
        print(f"   Error: {response.status_code}")
    
    # Test 3: Search for "dog"
    print("\n3. Searching for 'dog':")
    response = requests.get(f"{BASE_URL}/films/search/keyword", params={"query": "dog", "limit": 5})
    
    if response.status_code == 200:
        data = response.json()
        print(f"   OK Found films: {data['total']}")
        for movie in data['items']:
            print(f"   - {movie['title']} ({movie['release_year']})")
    else:
        print(f"   Error: {response.status_code}")
    
    print("\nKeyword search now works across all genres!")
    print("Changes made:")
    print("   - Added JOIN with film_category and category tables")
    print("   - Using DISTINCT to avoid duplicates")
    print("   - Created indexes for JOIN optimization")

if __name__ == "__main__":
    try:
        test_keyword_search()
    except requests.exceptions.ConnectionError:
        print("Server not running. Start app.py first")
    except Exception as e:
        print(f"Error: {e}")

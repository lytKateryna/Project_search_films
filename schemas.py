from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class Film(BaseModel):
    """Film model for API responses"""
    film_id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    release_year: Optional[int] = Field(None, ge=1900, le=2100)
    year: Optional[int] = Field(None, ge=1900, le=2100)  # Alternative field name
    rating: Optional[str] = None
    length: Optional[int] = Field(None, ge=0)  # Duration in minutes
    genres: Optional[List[str]] = []
    poster_url: Optional[str] = None
    poster: Optional[str] = None  # Alternative field name
    
    @validator('poster_url', pre=True, always=True)
    def set_default_poster(cls, v):
        return v or '/static/images/no-poster.svg'
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Genre(BaseModel):
    """Genre model for API responses"""
    category_id: int
    name: str = Field(..., min_length=1, max_length=100)
    
    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    """Generic paginated response model"""
    items: List[Film]
    total: int = Field(..., ge=0)
    offset: int = Field(..., ge=0)
    limit: int = Field(..., ge=1, le=50)
    count: int = Field(..., ge=0)
    
    # Optional search parameters
    query: Optional[str] = None
    year: Optional[int] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    category_id: Optional[int] = None
    full_name: Optional[str] = None  # For actor search
    
    class Config:
        from_attributes = True


class GenreListResponse(BaseModel):
    """Response model for genres list"""
    items: List[Genre]
    count: int = Field(..., ge=0)
    
    class Config:
        from_attributes = True


class YearRange(BaseModel):
    """Year range model"""
    min_year: int = Field(..., ge=1900, le=2100)
    max_year: int = Field(..., ge=1900, le=2100)
    
    @validator('max_year')
    def max_year_must_be_greater_or_equal(cls, v, values):
        if 'min_year' in values and v < values['min_year']:
            raise ValueError('max_year must be greater than or equal to min_year')
        return v


class SearchRequest(BaseModel):
    """Search request model"""
    query: Optional[str] = None
    year_from: Optional[int] = Field(None, ge=1900, le=2100)
    year_to: Optional[int] = Field(None, ge=1900, le=2100)
    category_id: Optional[int] = None
    offset: int = Field(0, ge=0)
    limit: int = Field(10, ge=1, le=50)
    
    @validator('year_to')
    def year_range_validation(cls, v, values):
        if v is not None and 'year_from' in values and values['year_from'] is not None:
            if v < values['year_from']:
                raise ValueError('year_to must be greater than or equal to year_from')
        return v


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    message: Optional[str] = None
    details: Optional[dict] = None

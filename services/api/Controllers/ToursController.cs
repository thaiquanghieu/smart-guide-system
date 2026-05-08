using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartGuideAPI.Data;
using SmartGuideAPI.Models;

namespace SmartGuideAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ToursController : ControllerBase
{
    private readonly AppDbContext _db;

    public ToursController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetTours()
    {
        try
        {
            var activeOwnerIds = await _db.Users
                .Where(x => x.Role == "owner" && x.IsActive && x.AccountStatus == "active")
                .Select(x => x.Id)
                .ToListAsync();

            var tours = await _db.Tours
                .Where(x => x.IsPublished)
                .OrderByDescending(x => x.UpdatedAt)
                .ToListAsync();
            var tourIds = tours.Select(x => x.Id).ToList();
            var tourPois = tourIds.Count == 0
                ? new List<TourPoi>()
                : await _db.TourPois
                    .Where(x => tourIds.Contains(x.TourId))
                    .OrderBy(x => x.SortOrder)
                    .ToListAsync();
            var poiIds = tourPois.Select(x => x.PoiId).Distinct().ToList();
            var pois = poiIds.Count == 0
                ? new List<Poi>()
                : await _db.Pois
                    .Where(x => poiIds.Contains(x.Id) && x.Status == "approved" && (!x.OwnerId.HasValue || activeOwnerIds.Contains(x.OwnerId.Value)))
                    .ToListAsync();
            var poiImages = poiIds.Count == 0
                ? new List<PoiImage>()
                : await _db.PoiImages
                    .Where(x => poiIds.Contains(x.PoiId))
                    .OrderBy(x => x.SortOrder)
                    .ToListAsync();

            var response = tours
                .Select(tour =>
                {
                    var items = tourPois
                        .Where(x => x.TourId == tour.Id)
                        .OrderBy(x => x.SortOrder)
                        .Select(link =>
                        {
                            var poi = pois.FirstOrDefault(x => x.Id == link.PoiId);
                            if (poi == null)
                                return null;

                            return new TourPoiSummary
                            {
                                id = poi.Id,
                                name = poi.Name,
                                category = poi.Category,
                                short_description = poi.ShortDescription,
                                address = poi.Address,
                                latitude = poi.Latitude,
                                longitude = poi.Longitude,
                                image = poiImages.FirstOrDefault(x => x.PoiId == poi.Id)?.ImageUrl,
                                sort_order = link.SortOrder
                            };
                        })
                        .Where(x => x != null)
                        .Cast<TourPoiSummary>()
                        .ToList();

                    return new
                    {
                        tour.Id,
                        tour.Name,
                        tour.Description,
                        cover_image_url = tour.CoverImageUrl,
                        poi_count = items.Count,
                        pois = items
                    };
                })
                .Where(x => x.poi_count > 0)
                .ToList();

            return Ok(response);
        }
        catch (Exception exception)
        {
            if (IsMissingToursSchema(exception))
                return Ok(Array.Empty<object>());

            return StatusCode(500, new
            {
                message = "Không tải được tour. Kiểm tra backend Railway và migration tours/tour_pois.",
                detail = exception.InnerException?.Message ?? exception.Message
            });
        }
    }

    private class TourPoiSummary
    {
        public string id { get; set; } = "";
        public string name { get; set; } = "";
        public string category { get; set; } = "";
        public string short_description { get; set; } = "";
        public string address { get; set; } = "";
        public double latitude { get; set; }
        public double longitude { get; set; }
        public string? image { get; set; }
        public int sort_order { get; set; }
    }

    private static bool IsMissingToursSchema(Exception exception)
    {
        var detail = exception.InnerException?.Message ?? exception.Message;
        return detail.Contains("relation \"tours\" does not exist", StringComparison.OrdinalIgnoreCase) ||
               detail.Contains("relation \"tour_pois\" does not exist", StringComparison.OrdinalIgnoreCase);
    }
}

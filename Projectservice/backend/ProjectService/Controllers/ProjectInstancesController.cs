using Microsoft.AspNetCore.Mvc;
using ProjectService.DTOs;
using ProjectService.Services;

namespace ProjectService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectInstancesController : ControllerBase
{
    private readonly ProjectCoreService _service;

    public ProjectInstancesController(ProjectCoreService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> AssignProject([FromBody] CreateInstanceDto dto)
    {
        try 
        {
            var instanceId = await _service.AssignProjectToClassAsync(dto);
            return Ok(new { Message = "Phân công thành công!", InstanceId = instanceId });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupDto dto)
    {
        try 
        {
            var groupId = await _service.CreateGroupAsync(dto);
            return Ok(new { Message = "Tạo nhóm thành công!", GroupId = groupId });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}

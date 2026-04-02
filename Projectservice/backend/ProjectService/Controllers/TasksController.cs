using Microsoft.AspNetCore.Mvc;
using ProjectService.DTOs;
using ProjectService.Services;

namespace ProjectService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ProjectCoreService _service;

    public TasksController(ProjectCoreService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskDto dto)
    {
        try
        {
            var taskId = await _service.CreateTaskAsync(dto);
            return Ok(new { Message = "Tạo task thành công!", TaskId = taskId });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpPut("status")]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateTaskStatusDto dto)
    {
        try
        {
            await _service.UpdateTaskStatusAsync(dto);
            return Ok(new { Message = "Cập nhật trạng thái thành công!" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}

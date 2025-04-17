let tasks = [];
let currentCategory = 'today';

// Inisialisasi Aplikasi
function init() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Silakan login terlebih dahulu.");
        window.location.href = "login.html";
        return;
    }
    updateStats();
    showCategory(currentCategory);
    setupTheme();
    initSortable();
    fetchTodos();
    updateActiveCategory(currentCategory);
}

// Tema Dark/Light
function setupTheme() {
    const toggle = document.getElementById('themeToggle');
    toggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });
}

// Ambil Todo dari API
async function fetchTodos() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("https://api-todo-list-pbw.vercel.app/todo/getAllTodos", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        tasks = result.data || [];
        updateStats();
        showCategory(currentCategory);
    } catch (err) {
        console.error('Fetch todos error:', err);
        // Fallback jika API gagal
        tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
        updateStats();
        showCategory(currentCategory);
    }
}

// Tampilkan Kategori
function showCategory(category) {
    currentCategory = category;
    const today = new Date().toISOString().split('T')[0];
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const priorityFilter = document.getElementById('filterPriority')?.value;
    
    const filteredTasks = tasks.filter(task => {
        let matchesCategory = true;
        switch(category) {
            case 'today':
                matchesCategory = task.dueDate === today && !task.completed;
                break;
            case 'upcoming':
                matchesCategory = task.dueDate > today && !task.completed;
                break;
            case 'completed':
                matchesCategory = task.completed;
                break;
            case 'all':
            default:
                matchesCategory = true;
        }
        
        const matchesSearch = task.text?.toLowerCase().includes(searchQuery);
        const matchesPriority = !priorityFilter || parseInt(task.priority) === parseInt(priorityFilter);
        return matchesCategory && matchesSearch && matchesPriority;
    });
    
    renderTasks(filteredTasks);
    updateCategoryTitle(category);
    updateActiveCategory(category);
}

// Render Tugas
function renderTasks(tasksToRender) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = tasksToRender.map(task => `
        <li class="task-item ... priority-${task.priority}">
            <div class="flex items-start gap-4">
                <!-- Checkbox -->
                <div class="flex items-center h-5 mt-1">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="toggleComplete('${task._id}')"
                           class="w-4 h-4 ...">
                </div>
                <!-- Isi Tugas -->
                <div class="flex-1 text-gray-800 dark:text-gray-200">
                    <span>${task.text}</span>
                    <span class="ml-2 text-sm ...">(Prioritas ${task.priority})</span>
                    ${ task.dueDate ? `<div class="text-xs text-gray-500">Jatuh tempo: ${task.dueDate}</div>` : '' }
                    ${ task.tags?.length ? `<div class="text-xs text-indigo-600">Tags: ${task.tags.join(', ')}</div>` : '' }
                    ${ task.subtasks?.length ? `<ul class="list-disc list-inside text-xs mt-1">
                            ${ task.subtasks.map(st => `<li>${st.text}</li>`).join('') }
                        </ul>` : '' }
                </div>
                <!-- Tombol Aksi (Selesai, Edit, Hapus) -->
                <div class="task-actions">
                    ${!task.completed ? `<button onclick="markAsCompleted('${task._id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm mr-2">Selesai</button>` : ''}
                    <button onclick="startEditTask('${task._id}')" class="text-blue-500 hover:text-blue-700 text-sm mr-2">Edit</button>
                    <button onclick="deleteTask('${task._id}')" class="text-red-500 hover:text-red-700 text-sm">Hapus</button>
                </div>
            </div>
        </li>
    `).join('');
}

// Update Status Complete
async function toggleComplete(id) {
    const token = localStorage.getItem("token");
    const task = tasks.find(t => t._id === id);
    if (!task) return;

    const updatedTask = {
        text: task.text || '',
        priority: parseInt(task.priority) || 4,
        completed: !task.completed
    };

    try {
        const response = await fetch(`https://api-todo-list-pbw.vercel.app/todo/updateTodo/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updatedTask)
        });

        if (response.ok) {
            const result = await response.json();
            task.completed = result.data.completed;
            // Juga simpan ke localStorage sebagai fallback
            localStorage.setItem("tasks", JSON.stringify(tasks));
            showCategory(currentCategory);
            updateStats();
        } else {
            // Fallback jika API gagal: update lokal saja
            task.completed = !task.completed;
            localStorage.setItem("tasks", JSON.stringify(tasks));
            showCategory(currentCategory);
            updateStats();
            console.warn("API gagal, tapi status diperbarui secara lokal");
        }
    } catch (err) {
        console.error('Update error:', err);
        // Fallback: update lokal saja
        task.completed = !task.completed;
        localStorage.setItem("tasks", JSON.stringify(tasks));
        showCategory(currentCategory);
        updateStats();
    }
}

// Update Active Category
function updateActiveCategory(category) {
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('bg-indigo-100', 'dark:bg-gray-700', 'text-indigo-600', 'dark:text-indigo-400');
        btn.classList.add('text-gray-700', 'dark:text-gray-300');
    });
    
    const activeBtn = document.querySelector(`button[onclick="showCategory('${category}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-100', 'dark:bg-gray-700', 'text-indigo-600', 'dark:text-indigo-400');
        activeBtn.classList.remove('text-gray-700', 'dark:text-gray-300');
    }
}

// Function to open the task modal
function openTaskModal() {
    document.getElementById('taskModal').classList.remove('hidden');
}

// Function to close the task modal
function closeTaskModal() {
    document.getElementById('taskModal').classList.add('hidden');
}

// Function to add or edit a task
async function addTask() {
    const title = document.getElementById('taskTitle').value;
    if (!title.trim()) { 
        alert('Judul tugas tidak boleh kosong!'); 
        return; 
    }
    
    const token = localStorage.getItem('token');
    const editId = document.getElementById("taskModal").getAttribute("data-edit-id");

    const taskData = {
        text: title,
        priority: parseInt(document.getElementById('taskPriority').value) || 4,
        dueDate: document.getElementById('taskDueDate').value,
        tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(t => t),
        subtasks: Array.from(document.querySelectorAll('.subtask-input')).map(input => ({ text: input.value, completed: false })),
        recurrence: document.getElementById('taskRecurrence').value,
        completed: false
    };

    // Untuk API, kita hanya kirim properti yang didukung API
    const apiTaskData = {
        text: taskData.text,
        priority: taskData.priority,
        completed: false
    };

    try {
        let response;
        
        if (editId) {
            // UPDATE
            response = await fetch(`https://api-todo-list-pbw.vercel.app/todo/updateTodo/${editId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(apiTaskData)
            });
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            
            const result = await response.json();
            
            // Update local task with both API returned data and our additional fields
            const index = tasks.findIndex(t => t._id === editId);
            if (index !== -1) {
                tasks[index] = { 
                    ...tasks[index], 
                    ...result.data,
                    dueDate: taskData.dueDate,
                    tags: taskData.tags,
                    subtasks: taskData.subtasks,
                    recurrence: taskData.recurrence
                };
            }
        } else {
            // CREATE
            response = await fetch('https://api-todo-list-pbw.vercel.app/todo/createTodo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(apiTaskData)
            });
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            
            const result = await response.json();
            
            // Buat task lokal dengan data dari API dan field tambahan
            const newTask = { 
                ...result.data,
                dueDate: taskData.dueDate,
                tags: taskData.tags,
                subtasks: taskData.subtasks,
                recurrence: taskData.recurrence
            };
            
            tasks.push(newTask);
        }
        
        // Simpan ke localStorage sebagai fallback
        localStorage.setItem("tasks", JSON.stringify(tasks));
        
        updateStats();
        showCategory(currentCategory);
        closeTaskModal();
        document.getElementById('taskForm').reset();
        document.getElementById('subtasksContainer').innerHTML = '';
        document.getElementById('taskModal').removeAttribute("data-edit-id");
    } catch (err) {
        console.error('Task error:', err);
        
        // Fallback: Jika API gagal, tetap perbarui data lokal
        if (editId) {
            const index = tasks.findIndex(t => t._id === editId);
            if (index !== -1) {
                tasks[index] = { 
                    ...tasks[index], 
                    ...taskData
                };
            }
        } else {
            // Generate temporary ID for local tasks
            const newTask = { 
                _id: 'local_' + Date.now(),
                ...taskData
            };
            tasks.push(newTask);
        }
        
        localStorage.setItem("tasks", JSON.stringify(tasks));
        updateStats();
        showCategory(currentCategory);
        closeTaskModal();
        document.getElementById('taskForm').reset();
        document.getElementById('subtasksContainer').innerHTML = '';
        document.getElementById('taskModal').removeAttribute("data-edit-id");
        
        console.warn("API gagal, tapi task diperbarui secara lokal");
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Update Task Stats
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
}

// Update Category Title
function updateCategoryTitle(category) {
    const titles = { all: 'Semua Tugas', today: 'Hari Ini', upcoming: 'Mendatang', completed: 'Selesai' };
    document.getElementById('categoryTitle').textContent = titles[category] || 'Tugas';
}

// Add Subtask Field
function addSubtaskField() {
    const container = document.getElementById('subtasksContainer');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Sub Tugas';
    input.className = 'subtask-input w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 dark:text-gray-200';
    container.appendChild(input);
}

// Init Sortable
function initSortable() {
    const el = document.getElementById('taskList');
    if (el && window.Sortable) {
        new Sortable(el, { animation: 150 });
    }
}

// Function to delete a task
async function deleteTask(id) {
    if (!confirm('Hapus tugas ini?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`https://api-todo-list-pbw.vercel.app/todo/deleteTodo/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        // Remove locally
        tasks = tasks.filter(t => t._id !== id);
        // Update localStorage
        localStorage.setItem("tasks", JSON.stringify(tasks));
        updateStats();
        showCategory(currentCategory);
    } catch (err) {
        console.error('Delete task error:', err);
        
        // Fallback: Jika API gagal, tetap hapus task secara lokal
        tasks = tasks.filter(t => t._id !== id);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        updateStats();
        showCategory(currentCategory);
        console.warn("API gagal, tapi task dihapus secara lokal");
    }
}

// Tambahkan fungsi Edit Tugas
function startEditTask(id) {
    const task = tasks.find(t => t._id === id);
    if (!task) return alert("Tugas tidak ditemukan.");

    document.getElementById("taskTitle").value = task.text;
    document.getElementById("taskPriority").value = task.priority;
    document.getElementById("taskDueDate").value = task.dueDate || '';
    document.getElementById("taskTags").value = (task.tags || []).join(", ");
    document.getElementById("taskRecurrence").value = task.recurrence || "none";
    
    const subtasksContainer = document.getElementById("subtasksContainer");
    subtasksContainer.innerHTML = "";
    (task.subtasks || []).forEach(st => {
        const input = document.createElement("input");
        input.type = "text";
        input.value = st.text;
        input.className = "subtask-input w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 dark:text-gray-200";
        subtasksContainer.appendChild(input);
    });

    document.getElementById("taskModal").setAttribute("data-edit-id", id);
    openTaskModal();

}

// Function to mark task as completed and switch to completed category
async function markAsCompleted(id) {
    const task = tasks.find(t => t._id === id);
    if (!task) return;
    
    // First set the task as completed
    const token = localStorage.getItem("token");
    const updatedTask = {
        text: task.text || '',
        priority: parseInt(task.priority) || 4,
        completed: true
    };

    try {
        const response = await fetch(`https://api-todo-list-pbw.vercel.app/todo/updateTodo/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updatedTask)
        });

        if (response.ok) {
            const result = await response.json();
            task.completed = true;
            // Juga simpan ke localStorage sebagai fallback
            localStorage.setItem("tasks", JSON.stringify(tasks));
            // Switch to completed category
            showCategory('completed');
            updateStats();
            updateActiveCategory('completed');
        } else {
            // Fallback jika API gagal: update lokal saja
            task.completed = true;
            localStorage.setItem("tasks", JSON.stringify(tasks));
            showCategory('completed');
            updateStats();
            updateActiveCategory('completed');
            console.warn("API gagal, tapi status diperbarui secara lokal");
        }
    } catch (err) {
        console.error('Update error:', err);
        // Fallback: update lokal saja
        task.completed = true;
        localStorage.setItem("tasks", JSON.stringify(tasks));
        showCategory('completed');
        updateStats();
        updateActiveCategory('completed');
    }
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', init);
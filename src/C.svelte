<!-- C.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	
	let interval;
	
	export let foo;
	export let bar;
	export let baz;
	
	onMount(() => {
		interval = setInterval(() => {
			foo++;
			bar++;
			baz++;
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});
</script>

<p>foo: {foo}; bar: {bar}; baz: {baz}</p>
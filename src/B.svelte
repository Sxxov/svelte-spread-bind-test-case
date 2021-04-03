<!-- B.svelte -->
<script>
	import C from './C.svelte';
	
	let baz = 3; // baz was abstracted out from A.svelte

	$: restProps = $$restProps;
	$: restProps, updateRestProps(restProps);

	function updateRestProps(restProps) {
		Object.entries(restProps).forEach(([key, value]) => {
			$$restProps[key] = value;
		})
	}
</script>

<C bind:baz {...bind:restProps} />